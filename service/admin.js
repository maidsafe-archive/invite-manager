import mongoose from 'mongoose';

const SchemaType = mongoose.Schema.Types;

class AdminService {

	constructor() {
		this.Admin = mongoose.model('admin', { 
			userName: SchemaType.String,
			createdOn: SchemaType.Date, 
			updatedOn: SchemaType.Date 
		});
	}

	list() {
		return new Promise((res, rej) => {
			this.Admin.find((err, list) => {
				err ? rej(err) : res(list);
			});
		});
	}

	isAdmin(userName) {
		return new Promise((res, rej) => {
			this.Admin.findOne({userName}, (err, user) => {
				err ? rej(err) : res(user ? true : false);
			});
		});
	}

	create(userName) {
		return new Promise((res, rej) => {
			const admin = new this.Admin({userName, createdOn: new Date, updatedOn: new Date});
			admin.save((err, admin) => {
				err ? rej(err) : res(admin);
			});
		});
	}

	delete(id) {
		return new Promise((res, rej) => {
			this.Admin.findByIdAndRemove(id, (err) => {
				err ? rej(err) : res();
			});
		});
	}

}

const adminService = new AdminService();
export default adminService;
