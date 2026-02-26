// 寮曞叆uni-map-common鍏叡妯″潡
const UniMap = require('uni-map-common');

const configCenter = require("uni-config-center");

// 璇诲彇閰嶇疆涓績鍦板浘閰嶇疆
let UniMapConfig = configCenter({ pluginId: 'uni-map' }).requireFile('config.js');

// 鏈湴鍦板浘閰嶇疆
const LocalMapConfig = {
	"default": "amap", // 榛樿浣跨敤鐨勫钩鍙?
	"key": {
		"qqmap": "", // 鑵捐鍦板浘key
		"amap": "56ab408890a598cb031e5ca5a9f002d7", // 楂樺痉鍦板浘key
	}
}

const db = uniCloud.database();
const _ = db.command;
const $ = _.aggregate;

const opendbPoiDB = db.collection("opendb-poi");

class MyError extends Error {
	constructor(errMsg, errCode = -1) {
		super(errMsg);
		this.err = {
			errCode,
			errMsg
		}
	}
}

module.exports = {
	_before: function() {
		// 濡傛灉閰嶇疆涓績涓嶅瓨鍦ㄥ湴鍥鹃厤缃紝鍒欎娇鐢ㄦ湰鍦板湴鍥鹃厤缃?
		if (!UniMapConfig) {
			UniMapConfig = LocalMapConfig;
		}
		let defaultProvider = UniMapConfig.default || "qqmap";
		let params = this.getParams();
		let {
			provider = defaultProvider,
				needOriginalResult = false
		} = params[0] || {};
		const key = UniMapConfig.key[provider] || LocalMapConfig.key[provider];
		if (!key) {
			throw { errCode: -1, errMsg: `璇峰湪uni-config-center/uni-map/config.js涓垨LocalMapConfig涓厤缃湴鍥句緵搴斿晢${provider}瀵瑰簲鐨刱ey` };
		}
		// 鍒濆鍖栧疄渚?
		let uniMap = new UniMap({
			provider: provider, // 鎸囧畾浣跨敤鍝鍦板浘渚涘簲鍟?
			key: key,
			needOriginalResult
		});
		this.uniMap = uniMap;
		// // 鍦ㄨ繖閲屽彲浠ュ仛涓€浜涚粺涓€鐨勫墠缃鐞嗭紝姣斿鏉冮檺鏍￠獙銆佸弬鏁版牎楠岀瓑
		// let {
		//   payload, // payload鍙傛暟涓哄墠绔紶閫掔殑鍙傛暟锛屽彲浠ュ湪鍓嶇璋冪敤uni.chooseLocation鏃朵紶閫?
		// } = this.getParams()[0] || {};
		// if (!payload) {
		//   throw new MyError("payload鍙傛暟涓嶈兘涓虹┖", -1);
		// }
		// // 濡傛灉涓氬姟鍦╱niCloud涓婏紝鍒欑洿鎺ュ湪杩欓噷鍐欏垽鏂€昏緫鍗冲彲
		// if (true) {
		// 	throw new MyError("鏉冮檺涓嶈冻", -1);
		// }

		// // 濡傛灉涓氬姟涓嶅湪uniCloud涓婏紝鍙€氳繃 uniCloud.request 璋冪敤鑷繁鐨勬湇鍔¤繘琛屾牎楠?
		// const requestRes = await uniCloud.request({
		//   method: 'POST',
		//   url: '浣犺嚜宸辩殑鎺ュ彛鍦板潃',
		//   data: payload,
		// });
		// // 绾﹀畾errCode涓嶄负0浠ｈ〃鏍￠獙澶辫触锛宔rrMsg涓哄け璐ュ師鍥?
		// if (requestRes.data.errCode !== 0) {
		//   throw new MyError(requestRes.data.errMsg, requestRes.data.errCode);
		// }

	},
	_after: function(err, res) {
		if (err) {
			if (err.err) {
				return err.err;
			}
			if (err.errCode) {
				return err;
			}
			throw err; // 濡傛灉鏂规硶鎶涘嚭閿欒锛屼篃鐩存帴鎶涘嚭涓嶅鐞?
		}
		console.log("result", res.result);
		return res;
	},
	// 鍑芥暟chooseLocation鏄粰uni.chooseLocation浣跨敤锛岃鍕夸慨鏀筩hooseLocation鍑芥暟鐨勪唬鐮?
	async chooseLocation(parame = {}) {
		let res = {};
		let {
			action,
			data,
			needOriginalResult
		} = parame;
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤API
		if (action === "search") {
			data.radius = 5000;
		}
		let result = await uniMap[action](data);
		res.result = needOriginalResult ? result.originalResult : result;
		// 妯℃嫙閿欒
		// res.errCode = 121;
		// res.errMsg = '姝ey姣忔棩璋冪敤閲忓凡杈惧埌涓婇檺'
		return res;
	},
	// 缁忕含搴﹀潗鏍囪浆鍦板潃
	async location2address(data = {}) {
		let res = {};
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤API
		let result = await uniMap.location2address(data);
		res.result = result;
		return res;
	},
	// 鍦板潃杞粡绾害鍧愭爣
	async address2location(data = {}) {
		let res = {};
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤API
		let result = await uniMap.address2location(data);
		res.result = result;
		return res;
	},
	// 鍧愭爣绯昏浆鎹?
	async translate(data = {}) {
		let res = {};
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤API
		let result = await uniMap.translate(data);
		res.result = result;
		return res;
	},
	// ip瀹氫綅
	async ip2location(data = {}) {
		let res = {};
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤API
		let result = await uniMap.ip2location(data);
		res.result = result;
		return res;
	},
	// 杈撳叆鎻愮ず
	async inputtips(data = {}) {
		let res = {};
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤API
		let result = await uniMap.inputtips(data);
		res.result = result;
		return res;
	},

	// 鎼滅储
	async search(data = {}) {
		let res = {};
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤API
		let result = await uniMap.search(data);
		res.result = result;
		return res;
	},

	// 琛屾斂鍖哄垝
	async districtSearch(data = {}) {
		let res = {};
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤API
		let result = await uniMap.districtSearch(data);
		res.result = result;
		return res;
	},

	// 璺緞瑙勫垝
	async route(data = {}) {
		let res = {};
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤API
		let result = await uniMap.route(data);
		res.result = result;
		return res;
	},
	// 涓囪兘璇锋眰
	async request(data = {}) {
		let res = {};
		// 寮曞叆閰嶇疆涓績
		const configCenter = require("uni-config-center");
		// 璇诲彇閰嶇疆涓績鍦板浘閰嶇疆
		const UniMapConfig = configCenter({ pluginId: 'uni-map' }).requireFile('config.js');
		// 鑾峰彇uniMap瀹炰緥
		const provider = "qqmap";
		const uniMap = new UniMap({
			provider: provider, // 鎸囧畾浣跨敤鍝鍦板浘渚涘簲鍟?
			key: UniMapConfig.key[provider], // 浣犵殑鍦板浘瀵嗛挜
			needOriginalResult: true, // 姝ゅ蹇呴』璁剧疆涓簍rue
		});
		// 璋冪敤API锛堜互鏅鸿兘纭欢瀹氫綅涓轰緥锛?
		let result = await uniMap.request({
			url: "ws/location/v1/network",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			dataType: "json",
			data: {
				device_id: "11",
				gpsinfo: {
					longitude: 116.39747,
					latitude: 39.908823,
				}
			}
		});
		console.log('result: ', result);
		res.result = result;
		return res;
	},

	// 婕旂ず鐢?- 娓呯┖鎵€鏈夌殑娴嬭瘯POI
	async clearPoi(data = {}) {
		let res = { errCode: 0 };
		const db = uniCloud.database();
		await db.collection("opendb-poi").where({
			is_random: true
		}).remove();
		return res;
	},

	// 婕旂ず鐢?- 鍒濆鍖栭潤鎬?01鍦烘櫙婕旂ず鏁版嵁
	async initStatic001(data = {}) {
		let res = { errCode: 0 };
		const category = "static-001";
		// 鍏堝垹闄?
		await opendbPoiDB.where({
			category: category
		}).remove();
		// 鍚庢坊鍔犻殢鏈烘暟鎹?

		// 浠ュぉ瀹夐棬涓轰腑蹇?
		let tiananmen = {
			longitude: 116.39747,
			latitude: 39.908823,
		};
		let time = Date.now();

		// 闅忔満鐢熸垚6涓棬搴楀湴鍧€
		let list = [];
		for (let i = 1; i <= 6; i++) {
			let randomCoordinate = getRandomCoordinateWithinRadius(tiananmen.longitude, tiananmen.latitude, 10); // 闅忔満鐢熸垚鍦ㄥぉ瀹夐棬鏂瑰渾X KM鍐呯殑鍧愭爣
			list.push({
				category: category, // 鍦烘櫙鍊硷紝鐢ㄤ簬鍖哄垎杩欎簺POI鎵€灞炲摢寮犲湴鍥?
				type: "闂ㄥ簵",
				title: `闅忔満闂ㄥ簵-${i}`,
				location: new db.Geo.Point(randomCoordinate.longitude, randomCoordinate.latitude),
				create_date: time,
				visible: true,
				is_random: true, // 琛ㄧず姝や负闅忔満鐢熸垚鐨勭偣锛屾柟渚垮垹闄?
				level: i
			});
		}
		// 闅忔満鐢熸垚1涓€婚儴鍦板潃
		let randomCoordinate = getRandomCoordinateWithinRadius(tiananmen.longitude, tiananmen.latitude, 1); // 闅忔満鐢熸垚鍦ㄥぉ瀹夐棬鏂瑰渾X KM鍐呯殑鍧愭爣
		list.push({
			category: category, // 鍦烘櫙鍊硷紝鐢ㄤ簬鍖哄垎杩欎簺POI鎵€灞炲摢寮犲湴鍥?
			type: "鎬婚儴",
			title: `闅忔満鎬婚儴`,
			location: new db.Geo.Point(randomCoordinate.longitude, randomCoordinate.latitude),
			create_date: time,
			visible: true,
			is_random: true, // 琛ㄧず姝や负闅忔満鐢熸垚鐨勭偣锛屾柟渚垮垹闄?
			level: 7
		});

		// 娣诲姞鍒版暟鎹簱
		await opendbPoiDB.add(list);

		return res;
	},

	// 婕旂ず鐢?- 鍒濆鍖栧姩鎬?01鍦烘櫙婕旂ず鏁版嵁锛堟ā鎷熼€佸鍗栧満鏅級
	async initDynamics001(data = {}) {
		let res = { errCode: 0 };

		const category = "dynamics-001";

		// 鍏堝垹闄?
		await opendbPoiDB.where({
			category: category
		}).remove();
		// 鍚庢坊鍔犻殢鏈烘暟鎹?

		// 浠ュぉ瀹夐棬涓轰腑蹇?
		let tiananmen = {
			longitude: 116.39747,
			latitude: 39.908823,
		};

		let time = Date.now();

		// 闅忔満鐢熸垚閰嶉€佸憳鍧愭爣
		let randomCoordinate1 = getRandomCoordinateWithinRadius(tiananmen.longitude, tiananmen.latitude, 2); // 闅忔満鐢熸垚鍦ㄥぉ瀹夐棬鏂瑰渾X KM鍐呯殑鍧愭爣
		let data1 = {
			category: category, // 鍦烘櫙鍊硷紝鐢ㄤ簬鍖哄垎杩欎簺POI鎵€灞炲摢寮犲湴鍥?
			type: "閰嶉€佸憳",
			title: "閰嶉€佸憳",
			location: new db.Geo.Point(randomCoordinate1.longitude, randomCoordinate1.latitude),
			create_date: time,
			visible: true,
			is_random: true, // 琛ㄧず姝や负闅忔満鐢熸垚鐨勭偣锛屾柟渚垮垹闄?
			level: 0,
			width: 40,
			height: 40
		}
		// 闅忔満鐢熸垚鐩殑鍦板潗鏍?
		let randomCoordinate2 = getRandomCoordinateWithinRadius(tiananmen.longitude, tiananmen.latitude, 2); // 闅忔満鐢熸垚鍦ㄥぉ瀹夐棬鏂瑰渾X KM鍐呯殑鍧愭爣
		let data2 = {
			category: category, // 鍦烘櫙鍊硷紝鐢ㄤ簬鍖哄垎杩欎簺POI鎵€灞炲摢寮犲湴鍥?
			type: "destination",
			title: "閰嶉€佺洰鐨勫湴",
			location: new db.Geo.Point(randomCoordinate2.longitude, randomCoordinate2.latitude),
			create_date: time,
			visible: true,
			is_random: true, // 琛ㄧず姝や负闅忔満鐢熸垚鐨勭偣锛屾柟渚垮垹闄?
			level: 1,
			width: 30,
			height: 30
		}
		let list = [data1, data2];
		// 娣诲姞鍒版暟鎹簱
		await opendbPoiDB.add(list);

		// 鑾峰彇閰嶉€佽矾绾?
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤鐢电摱杞﹁矾寰勮鍒扐PI
		let result = await uniMap.route({
			mode: "ebicycling",
			from: `${randomCoordinate1.latitude},${randomCoordinate1.longitude}`,
			to: `${randomCoordinate2.latitude},${randomCoordinate2.longitude}`,
			alternative_route: 1
		});

		let route = result.result.routes[0];
		let { steps = [] } = route;
		let points = [];
		steps.map((step) => {
			let {
				polyline = ""
			} = step;
			let arr = polyline.split(";");
			arr.map((item) => {
				let arr2 = item.split(",");
				points.push({
					latitude: Number(arr2[0]),
					longitude: Number(arr2[1]),
				});
			});
		});
		let polyline = {
			points,
			color: "#19b411",
			width: 6,
			dottedLine: false,
			arrowLine: true,
			borderWidth: 1,
			borderColor: "#000000",
		};
		res.polyline = [polyline];
		return res;
	},

	// 婕旂ず鐢?- 鑾峰彇閰嶉€佸憳閰嶉€佽矾寰?
	async getPolyline(data = {}) {
		let res = { errCode: 0 };

		const category = "dynamics-001";

		let getRes1 = await opendbPoiDB.where({
			category: category,
			type: "閰嶉€佸憳",
			visible: true
		}).get();
		let poi1 = getRes1.data[0];

		let getRes2 = await opendbPoiDB.where({
			category: category,
			type: "destination",
			visible: true
		}).get();
		let poi2 = getRes2.data[0];
		if (!poi2) {
			return {
				errCode: 0,
				end: true
			}
		}

		let coordinate1 = {
			longitude: poi1.location.coordinates[0],
			latitude: poi1.location.coordinates[1]
		};

		let coordinate2 = {
			longitude: poi2.location.coordinates[0],
			latitude: poi2.location.coordinates[1]
		};

		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤鐢电摱杞﹁矾寰勮鍒扐PI
		let result = await uniMap.route({
			mode: "ebicycling",
			from: `${coordinate1.latitude},${coordinate1.longitude}`,
			to: `${coordinate2.latitude},${coordinate2.longitude}`,
			alternative_route: 1
		});

		let route = result.result.routes[0];
		//console.log('route: ', route)
		let { steps = [], distance, duration } = route;
		let points = [];
		let dir_desc;
		steps.map((step) => {
			let {
				polyline = ""
			} = step;
			if (!dir_desc) dir_desc = step.dir_desc;
			if (polyline) {
				let arr = polyline.split(";");
				arr.map((item) => {
					let arr2 = item.split(",");
					if (!isNaN(arr2[0]) && !isNaN(arr2[1])) {
						points.push({
							latitude: Number(arr2[0]),
							longitude: Number(arr2[1]),
						});
					}
				});
			}
		});
		let polyline = {
			points,
			color: "#19b411",
			width: 6,
			dottedLine: false,
			arrowLine: true,
			borderWidth: 1,
			borderColor: "#000000",
		};
		res.polyline = [polyline];
		if (distance <= 30 || duration <= 0) {
			await opendbPoiDB.doc(poi1._id).update({
				title: `閰嶉€佸憳宸插埌杈剧洰鐨勫湴`,
				location: new db.Geo.Point(Number(coordinate2.longitude), Number(coordinate2.latitude)),
				rotate: 0
			});
			// 闅愯棌鐩殑鍦?
			await opendbPoiDB.doc(poi2._id).update({
				visible: false,
			});
			return {
				errCode: 0,
				end: true
			}
		} else {
			// 浠庢渶杩?涓偣璁＄畻鍑哄綋鍓嶈椹舵柟鍚?
			// let rotate = 0;
			// if (points && points.length >= 2) {
			// 	rotate = calculateDirectionAngle(points[0], points[1]);
			// }
			// await opendbPoiDB.doc(poi1._id).update({
			// 	title: `閰嶉€佸憳姝ｅ湪閰嶉€乗r\n杩樻湁 ${distance} 绫砛r\n棰勮 ${duration} 鍒嗛挓閫佽揪`,
			// 	rotate: rotate, // 璁剧疆瑙掑害锛?掳鐨勫浘鐗囨柟鍚戝簲鏈濆乏(瑗? 鏁?0掳 鏈濅笂(鍖? 180掳 鏈濆彸(涓? 270掳 鏈濅笅(鍗?
			// });
			await opendbPoiDB.doc(poi1._id).update({
				title: `閰嶉€佸憳姝ｅ湪閰嶉€乗r\n杩樻湁 ${distance} 绫砛r\n棰勮 ${duration} 鍒嗛挓閫佽揪`,
				rotate: 0,
			});
		}
		return res;
	},
	// 婕旂ず鐢?- 妯℃嫙涓婃姤閰嶉€佸憳鍧愭爣
	async updateMyLocation(data = {}) {
		let res = {};

		const category = "dynamics-001";

		let {
			longitude,
			latitude
		} = data;

		let getRes1 = await opendbPoiDB.where({
			category: category,
			type: "閰嶉€佸憳",
			visible: true
		}).get();
		let poi1 = getRes1.data[0];

		await opendbPoiDB.doc(poi1._id).update({
			location: new db.Geo.Point(Number(longitude), Number(latitude))
		});
		return res;
	},

	// 婕旂ず鐢?- xxxx
	async test(data = {}) {
		let res = {};
		// 鑾峰彇uniMap瀹炰緥
		const uniMap = this.uniMap;
		// 璋冪敤API
		let result = await uniMap.location2address({

		});
		res.result = result;
		return res;
	}
}



/**
 * 鐢熸垚鍦ㄦ寚瀹氱粡绾害鍦嗗唴鐨勯殢鏈哄潗鏍?
 
const latitude = 39.908823; // 鎸囧畾绾害
const longitude = 116.39747; // 鎸囧畾缁忓害
const radiusInKm = 10; // 鎸囧畾鍦嗙殑鍗婂緞锛堝崟浣嶏細鍗冪背锛?

const randomCoordinate = getRandomCoordinateWithinRadius(latitude, longitude, radiusInKm);
console.log(randomCoordinate);

 */
function getRandomCoordinateWithinRadius(longitude, latitude, radiusInKm) {
	// 鍦扮悆鍗婂緞锛堝崟浣嶏細鍗冪背锛?
	const earthRadius = 6371;

	// 灏嗗渾鐨勫崐寰勮浆鎹负寮у害
	const radiusInRad = radiusInKm / earthRadius;

	// 鐢熸垚闅忔満鐨勬柟浣嶈锛堝姬搴︼紝0鍒?蟺锛?
	const randomAngleRad = Math.random() * 2 * Math.PI;

	// 鐢熸垚闅忔満鐨勮窛绂伙紙寮у害锛?鍒板渾鐨勫崐寰勶級
	const randomDistanceRad = Math.acos(Math.random() * (Math.cos(radiusInRad) - 1) + 1);

	// 浣跨敤鐞冮潰涓夎瀛﹁绠楅殢鏈虹偣鐨勭含搴﹀拰缁忓害
	const randomLatitudeRad = latitude * (Math.PI / 180) + randomDistanceRad * Math.cos(randomAngleRad);
	const randomLongitudeRad = longitude * (Math.PI / 180) + randomDistanceRad * Math.sin(randomAngleRad) / Math.cos(latitude * (Math.PI / 180));

	// 杞崲涓哄害锛屽苟淇濈暀6浣嶅皬鏁?
	const randomLatitude = parseFloat((randomLatitudeRad * (180 / Math.PI)).toFixed(6));
	const randomLongitude = parseFloat((randomLongitudeRad * (180 / Math.PI)).toFixed(6));

	return { latitude: randomLatitude, longitude: randomLongitude };
}


/**
 * 璁＄畻鍧愭爣B鍦ㄥ潗鏍嘇鐨勬柟鍚戯紝0浠ｈ〃姝ｈタ鏂?90 浠ｈ〃姝ｅ寳鏂?
 
const latitude = 39.908823; // 鎸囧畾绾害
const longitude = 116.39747; // 鎸囧畾缁忓害
const radiusInKm = 10; // 鎸囧畾鍦嗙殑鍗婂緞锛堝崟浣嶏細鍗冪背锛?

const randomCoordinate = getRandomCoordinateWithinRadius(latitude, longitude, radiusInKm);
console.log(randomCoordinate);

 */
function calculateDirectionAngle(coordA, coordB) {
	const toRadians = (angle) => angle * (Math.PI / 180);
	const toDegrees = (angle) => angle * (180 / Math.PI);

	const lat1 = toRadians(coordA.latitude);
	const lon1 = toRadians(coordA.longitude);
	const lat2 = toRadians(coordB.latitude);
	const lon2 = toRadians(coordB.longitude);

	const dLon = lon2 - lon1;
	const y = Math.sin(dLon) * Math.cos(lat2);
	const x =
		Math.cos(lat1) * Math.sin(lat2) -
		Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
	const angleRadians = Math.atan2(y, x);

	let angleDegrees = toDegrees(angleRadians);
	angleDegrees = (angleDegrees + 360) % 360;

	angleDegrees = (angleDegrees > 180) ? angleDegrees - 180 : angleDegrees + 180;
	angleDegrees -= 90; // 浠ユ瑗挎柟涓?掳琛ㄧず锛屽洜姝ら渶瑕?90
	return angleDegrees;
}

