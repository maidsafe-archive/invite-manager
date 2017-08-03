import mongoose from 'mongoose';
import fs from 'fs';
import scpClient from 'scp2';

import Queue from '../queue';
import networkProxyService from './network_proxy';

const SchemaType = mongoose.Schema.Types;
const appConfig = require('../configs/app');
const proxyCred = require('../configs/cred');

if (!proxyCred || !proxyCred.scpPassword) {
    throw new Error('Proxy credential file missing or scpPassword key is missing. Add ./configs/cred.json');
}

class InviteService {

    constructor() {
        this.Invite = mongoose.model('invite', {
            token: {type: SchemaType.String, unique: true},
            claimedBy: { type: SchemaType.ObjectId, ref: 'user' },
            assignedTo: SchemaType.String,
            assignedBy: { type: SchemaType.ObjectId, ref: 'user' },
            used: {type: SchemaType.Boolean, index: true},
            testnet: SchemaType.String,
            ip: SchemaType.String,
            proxy_ips: [SchemaType.String],
            old_ips: [SchemaType.String],
            createdOn: SchemaType.Date,
            updatedOn: SchemaType.Date
        });
        this.queue = new Queue(data => this._claimToken(data));
        this.assignQueue = new Queue(data => this._assign(data));
    }

    _getIpsUsingProxy(testnet, proxyIp) {
        return new Promise((res, rej) => {
            this.Invite.find({
                proxy_ips: {"$in": [proxyIp]},
                testnet
            }, (err, list) => {
                err ? rej(err) : res(list);
            });
        });
    }

    _assign(data) {
        return new Promise((res, rej) => {
            try {
                this.Invite.findOne({used: false, testnet: data.testnet}, (err, invite) => {
                    if (!invite) {
                        data.rej('No invites available');
                        return rej('No invites available');
                    }
                    invite.used = true;
                    if (data.assignedBy) {
                        invite.assignedBy = data.assignedBy;
                        invite.assignedTo = data.user;
                    } else {
                        invite.claimedBy = data.user;
                    }
                    invite.save((err, invite) => {
                        console.log(err, invite);
                        err ? data.rej(err) : data.res(invite);
                        err ? rej(err) : res();
                    });
                });
            } catch (e) {
                console.error('Assign error', err);
                data.rej(e);
                rej(e);
            }
        });
    }

    _scpConfigFile(testnet, ip, proxyIp, oldIp) {
        return new Promise((res, rej) => {
            this._getIpsUsingProxy(testnet, proxyIp)
                .then(list => {
                    try {
                        const localFileName = proxyIp.replace(/\./g, '_');
                        for (let i = 0; i < list.length; i++) {
                            list[i] = list[i].ip;
                        }
                        if (list.indexOf(ip) === -1) {
                            list.push(ip);
                        }
                        res();
                        // const template = Object.assign({}, require(`${testnet}.config.json`));
                        // template.whitelisted_client_ips = list;
                        // if (oldIp) {
                        //     const oldIpIndex = template.whitelisted_client_ips.indexOf(oldIp);
                        //     if (oldIpIndex > -1) {
                        //         template.whitelisted_client_ips.splice(oldIpIndex, 1);
                        //     }
                        // }
                        // fs.writeFileSync(localFileName, new Buffer(JSON.stringify(template, null, 2)));
                        // const proxyConfig = Object.assign({}, appConfig.scp);
                        // proxyConfig.host = proxyIp;
                        // proxyConfig.password = proxyCred.scpPassword;
                        // console.log('SCP to', proxyIp);
                        // scpClient.scp(localFileName, proxyConfig, (err) => {
                        //     console.log('SCP completed', proxyIp);
                        //     err ? rej(err) : res();
                        // });
                    } catch (e) {
                        rej(e);
                    }
                });
        });
    }

    _claimToken(data) {
        return new Promise((res, rej) => {
            this.get(data.testnet, data.token)
                .then(inviteToken => {
                    if (!inviteToken) {
                        return data.rej('Invite not found');
                    }

                    const onPrepared = (inviteToken, proxyIpList, previousIp) => {
                        inviteToken.proxy_ips = proxyIpList;
                        const promises = [];
                        for (let i = 0; i < inviteToken.proxy_ips.length; i++) {
                            promises.push(this._scpConfigFile(inviteToken.testnet, data.ip, inviteToken.proxy_ips[i], previousIp));
                        }
                        Promise.all(promises)
                            .then(() => {
                                inviteToken.save((err) => {
                                    if (err) {
                                        data.rej(err);
                                        return rej(err);
                                    }
                                    data.res();
                                    res();
                                })
                                .catch((e) => {
                                    data.rej(e);
                                    rej(e);
                                });
                            });
                    };
                    try {
                        const firstTime = inviteToken.proxy_ips ? (inviteToken.proxy_ips.length === 0) : true;
                        const oldIpList = inviteToken.oldIpList || [];
                        if (!firstTime && oldIpList.indexOf(inviteToken.ip) === -1) {
                            oldIpList.push(inviteToken.ip);
                        }
                        const previousIp = inviteToken.ip;
                        if (!inviteToken.claimedBy && data.user) {
                            inviteToken.claimedB = data.user._id;
                        }
                        inviteToken.updatedOn = new Date;
                        inviteToken.ip = data.ip;
                        inviteToken.used = true;
                        inviteToken.old_ips = oldIpList;
                        if (!firstTime) {
                            onPrepared(inviteToken, inviteToken.proxy_ips, previousIp);
                        } else {
                            networkProxyService.random(inviteToken.testnet)
                                .then(list => onPrepared(inviteToken, list))
                                .catch(e => {
                                    data.rej(e);
                                    rej(e);
                                });
                        }
                    } catch (e) {
                        data.rej(e);
                        rej(e);
                    }
                })
                .catch((e) => {
                    data.rej(e);
                    rej(e);
                });
        });
    }

    get(testnet, token) {
        return new Promise((res, rej) => {
            this.Invite.findOne({
                testnet,
                token
            }, (err, invite) => {
                if (err) {
                    return rej(err);
                }
                res(invite);
            });
        });
    }

    findByUserId(testnet, userId) {
        return new Promise((res, rej) => {
            this.Invite.findOne({testnet, claimedBy: userId}, (err, invite) => {
                err ? rej(err) : res(invite);
            });
        });
    }

    findByAssignedTo(testnet, userId) {
        return new Promise((res, rej) => {
            this.Invite.findOne({testnet, assignedTo: userId}, (err, invite) => {
                err ? rej(err) : res(invite);
            });
        });
    }

    list(testnet) {
        return new Promise((res, rej) => {
            this.Invite.find({testnet}, (err, list) => {
                err ? rej(err) : res(list);
            });
        });
    }

    listUsed(testnet) {
        return new Promise((res, rej) => {
            this.Invite.find({used: true, testnet}, (err, list) => {
                err ? rej(err) : res(list);
            });
        });
    }

    listNotUsed(testnet) {
        return new Promise((res, rej) => {
            this.Invite.find({used: false, testnet}, (err, list) => {
                err ? rej(err) : res(list);
            });
        });
    }

    create(testnet, token) {
        return new Promise((res, rej) => {
            const invite = new this.Invite({
                token,
                testnet,
                createdOn: new Date,
                updatedOn: new Date,
                used: false
            });
            invite.save((err, inviteToken) => {
                err ? rej(err) : res(inviteToken);
            });
        });
    }

    claim(testnet, ip, token, user) {
        return new Promise((res, rej) => {
            console.log('pushed');
            this.queue.push({testnet, ip, token, user, res, rej});
        });
    }

    assignForUser(testnet, userId, assignedBy) {
        console.log('Assigning token', testnet, userId, assignedBy);
        return new Promise((res, rej) => {
            this.assignQueue.push({testnet, user: userId, assignedBy, res, rej});
        });
    }

    delete(id) {
        return new Promise((res, rej) => {
            this.Invite.findByIdAndRemove(id, (err) => {
                err ? rej(err) : res();
            });
        });
    }

    deleteAll(testnet) {
        return new Promise((res) => {
            this.Invite.remove({testnet});
            res();
        });
    }

    getStats(testnet) {
        return new Promise((res, rej) => {
            let consumed = 0;
            let available = 0;
            let assigned = 0;
            let notUsed = 0;
            let forumNotUsed = 0;
            let assignedInvites = [];
            let consumedInvites = [];
            const getAssignedNotUsedCount = () => {
                this.Invite.count({
                    testnet,
                    assignedBy: {$exists: true, $ne: null},
                    ip: {$exists: false}
                },
                (err, count) => {
                    if (err) {
                        return rej(err);
                    }
                    notUsed = count;
                    res({
                        consumed,
                        available,
                        assigned,
                        notUsed,
                        forumNotUsed,
                        assignedInvites,
                        consumedInvites
                    });
                });
            };
            const getAssignedCount = () => {
                this.Invite.find({testnet, assignedBy: {$exists: true, $ne: null}})
                    .populate('assignedBy')
                    .exec((err, list) => {
                        if (err) {
                            return rej(err);
                        }
                        assignedInvites = list;
                        assigned = list.length;
                        getAssignedNotUsedCount();
                    });
            };
            const getAvailableCount = () => {
                this.Invite.count({testnet, used: false}, (err, count) => {
                    if (err) {
                        return rej(err);
                    }
                    available = count;
                    getAssignedCount();
                });
            };
            this.Invite.find({testnet, used: true, assignedBy: {$exists: false}})
                .populate('claimedBy')
                .exec((err, list) => {
                    if (err) {
                        return rej(err);
                    }
                    for (let i=0; i<list.length;i++) {
                        if (!list[i].ip) {
                            forumNotUsed++;
                        }
                    }
                    consumedInvites = list;
                    consumed = list.length;
                    getAvailableCount();
                });
        });
    }
}

const inviteService = new InviteService();
export default inviteService;
