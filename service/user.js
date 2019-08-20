import mongoose from 'mongoose';

const SchemaType = mongoose.Schema.Types;

class UserService {

	constructor() {
		this.User = mongoose.model('user', { 
			id: SchemaType.String,
			userName: SchemaType.String,
			// email: SchemaType.String,
			strategy: SchemaType.String,
			createdOn: SchemaType.Date,
			lastLogIn: SchemaType.Date
		});
	}

	list() {
		return new Promise((res, rej) => {
			this.User.find((err, list) => {
				err ? rej(err) : res(list);
			});
		});
	}

	find(id, strategy) {
		return new Promise((res, rej) => {
			this.User.findOne({id, strategy}, (err, user) => {
				err ? rej(err) : res(user);
			});
		});
	}

	create(user) {
		return new Promise((res, rej) => {
			const {id, userName, strategy } = user;
			const userModel = new this.User({id, strategy, userName, createdOn: new Date, lastLogIn: new Date});
			userModel.save((err, userObj) => {
				err ? rej(err) : res(userObj);
			});
		});
	}

	delete(id) {
		return new Promise((res, rej) => {
			this.User.findByIdAndRemove(id, (err) => {
				err ? rej(err) : res();
			});
		});	
	}

	deleteAll() {
		return new Promise((res, rej) => {
			this.User.remove({}, (err) => {
				err ? rej(err) : res();
			});
		});	
	}

}

const userService = new UserService();
export default userService;
