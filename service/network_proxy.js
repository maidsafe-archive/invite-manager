import mongoose from 'mongoose';
import appStateService from './app_state';
const PROXY_NODE_LENGTH = 4;
const SchemaType = mongoose.Schema.Types;

class NetworkProxyService {

	constructor() {
		this.Proxy = mongoose.model('proxy', {
			testnet: SchemaType.String,
			ip: SchemaType.String,
			createdOn: SchemaType.Date
		}, 'proxy');
		this.lastRandomIndex = 0;
	}

	list(testnet) {
		return new Promise((res, rej) => {
			this.Proxy.find({testnet}, (err, list) => {
				err ? rej(err) : res(list);
			});
		});
	}

	create(testnet, ip) {
		return new Promise((res, rej) => {
			const proxy = new this.Proxy({testnet, ip, createdOn: new Date});
			proxy.save((err, proxy) => {
				err ? rej(err) : res(proxy);
			});
		});
	}

	random(testnet) {
		return new Promise(async (res, rej) => {
			try {
                const proxyList = await this.list(testnet);
                const proxyNodes = [];
                const appState = await appStateService.getState(testnet);
            	let lastIndex = appState.lastRandomIndex;
                for (let i = 0; i < PROXY_NODE_LENGTH; ++i) {
                    proxyNodes.push(proxyList[lastIndex].ip);
                    lastIndex = lastIndex >= proxyList.length - 1 ? 0 : lastIndex + 1;
                }
                await appStateService.updateState(testnet, lastIndex);
                res(proxyNodes)
            } catch (e) {
				rej(e);
			}
		});
	}

	delete(id) {
		return new Promise((res, rej) => {
			this.Proxy.findByIdAndRemove(id, (err) => {
				err ? rej(err) : res();
			});
		});
	}

	deleteAll(testnet) {
		return new Promise((res, rej) => {
			this.Proxy.remove({testnet});
			res();
		});
	}

}

const networkProxyService = new NetworkProxyService();
export default networkProxyService;
