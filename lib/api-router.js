"use strict";
function getChild(f, k) {
	if (!f) {
		return null;
	}
	if (k in f && !f[k]._disabledRouter) {
		return f[k];
	} else if ((k + "4web") in f) {
		return f[k + "4web"];
	}
	return null;
}
function dataProcessing(data, req) {
	return data;
}
function apiRouter(func, {getChild = getChild, dataProcessing = dataProcessing} = {}) {
	return async (path, data, send, next, ...mp) => {
		path = path.replace(/\\\//g,'.').split(".").filter(x=>x);
		let f = func;
		let k;
		while(k = path.shift()) {
			if(!f || typeof f === "function") {
				return next();
			}
			if (k[0] === "_") {
				return next();
			}
			f = await getChild(f, k);
			if (!f) {
				return next();
			}
		}
		if (typeof f !== "function") {
			return next();
		}
		if (!data || !(typeof data !== "objcet")) {
			data = {};
		}
		try {
			await dataProcessing(data, ...mp);
			f = await f(data);
		} catch(e) {
			if (!e.error) {
				console.error(e);
				f = {error:":system:", msg:"系统错误!"};
			} else {
				f = e;
			}
		}
		return send(f);
	}
}
function express(func, opt) {
	let router = apiRouter(func, opt);
	return (res, req, next) => {
		if (req.method !== "POST") {
			return next();
		}
		return router(
			req.path,
			req.body,
			json => {
				if (json && json.setCookie) {
					let setCookie = json.setCookie;
					if (Array.isArray(setCookie)) {
						delete json.setCookie;
						res.set("set-cookie",setCookie);
					}
				}
				try {
					json = JSON.stringify(json);
				} catch(e) {
					json = `{error:":system:", msg:"系统错误!"}`;
				}
				res.set('Content-Type', "application/json");
				return res.end(json);
			},
			next,
			req
		);
	}
}
exports.apiRouter = apiRouter;
apiRouter.express = express;
