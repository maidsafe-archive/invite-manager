import mongoose from 'mongoose';

const SchemaType = mongoose.Schema.Types;

class AppStateService {

    constructor() {
        this.AppState = mongoose.model('appState', {
            testnet: SchemaType.String,
            lastRandomIndex: SchemaType.Number
        }, 'appState');
    }

    getState(testnet) {
        return new Promise((res, rej) => {
            this.AppState.findOne({testnet}, (err, state) => {
                err ? rej(err) : res(state || {lastRandomIndex: 0});
            });
        });
    }

    updateState(testnet, lastIndex) {
        return new Promise((res, rej) => {
            this.AppState.findOne({testnet}, (err, state) => {
                if (err) {
                   return rej(err);
                }
                if (!state) {
                    state = new this.AppState({testnet, lastRandomIndex: lastIndex});
                } else {
                    state.lastRandomIndex = lastIndex;
                }
                state.save((err) => {
                    err ? rej(err) : res();
                });
            });
        });
    }

}

const appStateService = new AppStateService();
export default appStateService;
