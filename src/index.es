"use strict";
class asyncRouter {
	constructor({
		entity,
		restrict,
		verify,
		protect,
	}) {
		this._setList = {};
		this._routerList = [];
		if (Array.isArray(protect) || protect instanceof Set) {
			this._protect = new Set(protect);
		} else if (protect) {
			this._protect = new Set([protect]);
		} else {
			this._protect = new Set();
		}
		this.$entity = entity;
		this.$restrict = restrict;
		this.$verify = verify;
	}
	//初始化入口参数
	_entity(...p) {
		return [null, ...p];
	}
	set $entity(entity) {
		if (typeof entity === "function") {
			this._entity = entity;
		}
	}
	get $entity() {
		return this._entity;
	}
	//约束
	_restrict(r) {
		return r; 
	}
	set $restrict(restrict) {
		if (typeof restrict === "function") {
			this._restrict = restrict;
		}
	}
	get $restrict() {
		return this._restrict;
	}
	//约束验证
	_verify() {
		return true;
	}
	set $verify(verify) {
		if (typeof verify === "function") {
			this._verify = verify;
		}
	}
	get $verify() {
		return this._verify;
	}
	async $use(...f) {
		let r, t;
		if (typeof f[0] !== 'function') {
			r = f.shift();
		}
		if (f.length > 1 && typeof f[f.length - 1] === 'string') {
			t = f.pop();
		}
		f = f.filter(f=>typeof f === 'function');
		if (!f.length) {
			return false;
		}
		let list = this._routerList;
		r = await this._restrict(r);
		f.map(f => {
			list.push({type:t, restrict: r, func: f});
		});
		return true;
	}
	async $run(...p) {
		let th, pa;
		//路由列表
		let list = Array.from(this._routerList);
		let setList = this._setList;

		let i = -1, length = list.length;
		//逐步验证
		const next = async (...np) => {
			if (++i >= length) {
				return ;
			}
			let {type: t, restrict: c, func: f} = list[i];
			//类型验证
			if (typeof t === "function" && !await t.call(this, ...p)) {
				return next();
			} else if (t && t in setList && !await setList[t].call(this, ...p)) {
				return next();
			}
			//约束验证
			if (c && !await this._verify(c, ...p)) {
				return next();
			}
			//运行
			return f.call(th, ...pa, ...np);
		}
		//获取实际参数
		p = await this._entity(next, ...p);
		if (Array.isArray(p)) {
			[th, ...pa] = p;
		} else {
			th = p;
			pa = [];
		}
		return next();
	}
	$set(n, p) {
		if (!(n && typeof n === "string" && /^[a-z][a-z0-9_]*$/i.test(n))) {
			return false;
		}
		if (typeof p !== "function") {
			retun false;
		}
		this[n] = p;
		return true;
	}
	$register(n, t) {
		if (!/^[a-z][a-z0-9_]*$/i.test(n)  || n in this || this._protect.has(n)) {
			return false;
		}
		if (!(t && typeof t === "string" && /^[a-z][a-z0-9_]*$/i.test(t))) {
			t = n;
		}
		this[n] = function(...p) {return this.$use(...p, t);}
		return true;
	}
}
exports.async = asyncRouter;
