const appConfig = require('./configs/app');

export const isSuperAdmin = (req) => {
	return !(!req || !req.session || !req.session.passport || !req.session.passport.user.email ||
		(appConfig.superAdmins.indexOf(req.session.passport.user.email) === -1));
};

export const getClientIp = (req) => {
	return req.ip.replace('::ffff:', '');
};
