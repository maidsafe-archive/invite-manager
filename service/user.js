import mongoose from 'mongoose';

const SchemaType = mongoose.Schema.Types;

class UserService {

	constructor() {
		this.User = mongoose.model('user', { 
			id: SchemaType.String,
			userName: SchemaType.String,
			email: SchemaType.String,
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

	create(id, email, strategy, userName) {
		return new Promise((res, rej) => {
			const user = new this.User({id, email, strategy, userName, createdOn: new Date, lastLogIn: new Date});
			user.save((err, user) => {
				err ? rej(err) : res(user);
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
