const mongoose = require('mongoose');

const TESTNET_NAME = 'TEST-17';

const exitOnError = (err) => {
    console.log(err);
    return process.exit(1);
};

class Queue {

    constructor(executor) {
        this.queue = [];
        this.executor = executor;
        this.isRunning = false;
    }

    _execute() {
        const data = this.queue.splice(0, 1)[0];
        const onComplete = () => {
            if (this.queue.length === 0) {
                return this.isRunning = false;
            }
            this._execute();
        };
        this.executor(data)
            .then(onComplete)
            .catch(onComplete);
    }

    push(data) {
        this.queue.push(data);
        if (!this.isRunning) {
            this.isRunning = true;
            this._execute();
        }
    }
};


class Iterator {
    constructor(cb, invites) {
        this.newList = [];
        this.callback = cb;
        this.invites = invites;
        this.queue = new Queue((data) => this._execute(data));
    }

    start() {
        for (let i = 0; i < this.invites.length; i++) {
            this.queue.push(this.invites[i]);
        }
    }


    getAssignedBy(userName, cb) {
        mongoose.connection.db.collection('users', (err, collection) => {
            collection.find({userName}).toArray((err, list) => {
                if (err) {
                    return exitOnError(err);
                }
                cb(list[0]._id);
            })
        });
    };

    _execute(invite) {
        return new Promise((req, res) => {
            if (invite.claimedBy) {
                this.newList.push(invite);
                if (this.newList.length === this.invites.length) {
                    this.callback(this.newList);
                }
                return res();
            }
            if (!invite.assignedBy) {
                this.newList.push(invite);
                if (this.newList.length === this.invites.length) {
                    this.callback(this.newList);
                }
                return res();
            }
            this.getAssignedBy(invite.assignedBy, (id) => {
                invite.assignedBy = id;
                this.newList.push(invite);
                if (this.newList.length === this.invites.length) {
                    this.callback(this.newList);
                }
                return res();
            });
        });
    }
}

const transformInvites = () => {
    console.log('Transforming invites..');
    const insertIntoNewCollection = (list) => {
        mongoose.connection.db.collection('invites_new', (err, collection) => {
            if (err) {
                return exitOnError(err);
            }
            // console.log(list);
            collection.insert(list, (err) => {
                console.log('Inserted Invites to new collection :: ', err);
            })
        });
    };

    mongoose.connection.db.collection('invites', (err, collection) => {
        if (err) {
            return exitOnError(err);
        }

        collection.find().toArray((err, list) => {
            if (err) {
                return exitOnError(err);
            }
            const transformedList = [];
            for (let i = 0; i < list.length; i++) {
                let assignedBy;
                let claimedBy;
                let assignedTo;

                try {
                    if (list[i].user) {
                        claimedBy = new mongoose.Types.ObjectId(list[i].user);
                    }
                } catch(e) {
                    assignedTo = list[i].user;
                    assignedBy = list[i].assignedBy;
                }
                if (claimedBy) {
                    list[i].claimedBy = claimedBy;
                } else {
                    delete list[i].claimedBy;
                }
                if (assignedTo) {
                    list[i].assignedBy = assignedBy;
                    list[i].assignedTo = assignedTo;
                } else {
                    delete list[i].assignedBy;
                    delete list[i].assignedTo;
                }
                list[i].testnet = TESTNET_NAME;
                delete list[i].user;
                transformedList.push(list[i]);
            }
            new Iterator(insertIntoNewCollection, transformedList).start();
        });
    })
};

const transformProxy = () => {
    mongoose.connection.db.collection('proxy', (err, collection) => {
        if (err) {
            return exitOnError(err);
        }
        collection.find().toArray((err, list) => {
            if (err) {
                return exitOnError(err);
            }
            for (let i = 0; i < list.length; i++) {
                list[i].testnet = TESTNET_NAME;
            }
            mongoose.connection.db.collection('proxy_new', (err, newCollection) => {
                newCollection.insert(list);
                console.log('---------- Proxy -- Completed --------------');
            });
        });
    });
};


const transformAppState = () => {
    mongoose.connection.db.collection('appState', (err, collection) => {
        if (err) {
            return exitOnError(err);
        }
        collection.find().toArray((err, list) => {
            if (err) {
                return exitOnError(err);
            }
            for (let i = 0; i < list.length; i++) {
                list[i].testnet = TESTNET_NAME;
            }
            mongoose.connection.db.collection('appState_new', (err, newCollection) => {
                newCollection.insert(list);
                console.log('----------AppState -- Completed --------------');
            });
        });
    });
};

const start = () => {
    transformInvites();
    transformProxy();
    transformAppState();
};

mongoose.connect('mongodb://localhost/invites_manager_copy')
    .then(() => {
        console.log('Connected to DB');
        start();
    })
    .catch(e => {
        console.log(e);
        throw e;
    });

