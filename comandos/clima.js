const { loggerInfo, loggerWarn } = require("./logger");
const fetch = require('sync-fetch');
const removeAccents = require('remove-accents');


/*
Crédios zack https://gist.github.com/zaacksb
+55 11 98235-5130
*/

function formatApiWeather(customKeys, obj){
	const locales = new Map()
	Object.entries(obj).map(([key, value], index) => {
		if(typeof customKeys == "object" && customKeys.includes(key)){
			value?.map((item, index)=> {
				locales.set(index, {
					...locales.get(index),
					index: index+1,
					[key]: item
				})
			})
		} else if(!customKeys){
			value?.map((item, index)=> {
				locales.set(index, {
					...locales.get(index),
					index: index+1,
					[key]: item
				})
			})
		}
	})
	
	const formatedLocales = Array.from(locales).map(locale => {
		return {
			index: locale[0],
			...locale[1]
		}
	})

	return formatedLocales
}

function findKey(obj, key){
	for (const k in obj) {
		if (k === key) {
			return obj[k];
		}
		if (typeof obj[k] === 'object') {
			const value = findKey(obj[k], key);
			if (value) {
				return value;
			}
		}
	}
	return null;
}

function extractKeysFromObj(obj, keys){
	const newObj = {}
	Object.entries(obj).map(([key, value]) => {
		if(keys.includes(key)) newObj[key] = value
	})
	return newObj
}

async function weatherNow(latitude, longitude){
	const climaEndpoint = `https://weather.com/api/v1/p/redux-dal`
	const formBody = [
		{
			"name": "getSunWeatherAlertHeadlinesUrlConfig",
			"params": {
				"geocode": `${latitude},${longitude}`,
				"units": "m",
				"language": "pt-BR"
			}
		},
		{
			"name": "getSunV3CurrentObservationsUrlConfig",
			"params": {
				"geocode": `${latitude},${longitude}`,
				"units": "m",
				"language": "pt-BR"
			}
		},
		{
			"name": "getSunV3DailyForecastWithHeadersUrlConfig",
			"params": {
				"duration": "7day",
				"geocode": `${latitude},${longitude}`,
				"units": "m",
				"language": "pt-BR"
			}
		},
		{
			"name": "getSunIndexPollenDaypartUrlConfig",
			"params": {
				"duration": "3day",
				"geocode": `${latitude},${longitude}`,
				"units": "m",
				"language": "pt-BR"
			}
		}
	]
	const response = await fetch(climaEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(formBody)
	})
	const resJson = await response.json()
	const getSunV3CurrentObservationsUrlConfig = findKey(resJson, "getSunV3CurrentObservationsUrlConfig")
	const currentWeatherData = findKey(getSunV3CurrentObservationsUrlConfig, "data")
	const currentWeatherStatus = findKey(getSunV3CurrentObservationsUrlConfig, "status")

	if(currentWeatherStatus !== 200){
		return {
			success: false,
			message: findKey(currentWeatherData, "statusText")
		}
	}else{
		let extractKeys = [
			"validTimeLocal",
			"cloudCoverPhrase",
			"dayOfWeek",
			"dayOrNight",
			"iconCode",
			"pressureAltimeter",
			"pressureTendencyTrend",
			"relativeHumidity",
			"snow1Hour",
			"snow6Hour",
			"snow24Hour",
			"sunriseTimeLocal",
			"sunsetTimeLocal",
			"temperature",
			"temperatureFeelsLike",
			"temperatureChange24Hour",
			"uvDescription",
			"uvIndex",
			"pressureMeanSeaLevel",
			"temperatureMax24Hour",
			"temperatureMin24Hour",
			"windDirectionCardinal",
			"windSpeed",
			"visibility",
			"wxPhraseLong"
		]
		const current = extractKeysFromObj(currentWeatherData, extractKeys)

		const getSunV3DailyForecastWithHeadersUrlConfig = findKey(resJson, "getSunV3DailyForecastWithHeadersUrlConfig")
		const dailyWeatherData = findKey(getSunV3DailyForecastWithHeadersUrlConfig, "data")
		extractKeys = ["calendarDayTemperatureMin", "dayOfWeek", "expirationTimeUtc", "moonPhase", "narrative", "sunriseTimeLocal", "sunsetTimeLocal", "temperatureMax", "temperatureMin", "validTimeLocal"]
		const dailyWeather = formatApiWeather(extractKeys, dailyWeatherData)
		return {
			success: true,
			current,
			dailyWeather,
		}
	}
}

async function searchCityWeather(name){
	const climaEndpoint = `https://weather.com/api/v1/p/redux-dal`
	const formBody = [
		{
			"name": "getSunV3LocationSearchUrlConfig",
			"params": {
				"query": `${name}`,
				"language": "pt-BR",
				"locationType": "locale"
			}
		}
	]
	const response = await fetch(climaEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(formBody)
	})
	const resJson = await response.json()
	const location = findKey(resJson, "location")
	const statusCode = findKey(resJson, "status")
	if(statusCode == 200){

		
		const extractKeys = ["address", "adminDistrict", "city", "country", "countryCode", "latitude", "longitude", "type", "postalCode"]
		const locales = formatApiWeather(extractKeys, location)
		return {
			success: true,
			locales
		}
	}else{
		return {
			success: false,
			message: findKey(response, "statusText")
		}
	}
}


function randomFromArray(items){
	return items[Math.floor(Math.random()*items.length)];
}


function randomIntFromInterval(min, max) { // min and max included 
	return Math.floor(Math.random() * (max - min + 1) + min)
}

async function getClimaByLocation(cityName, msg){
	const retorno = [];

	loggerInfo(`[getClimaByLocation][${msg.from}/${msg.author}] Buscando clima para '${cityName}'`);
	// Zueira
	const climaFixo = {
		vagina: [`Agora em Vagina/BR está atualmente ${randomIntFromInterval(36,40)}°C 🌡️ (sensação térmica de ${randomIntFromInterval(36,40)}°C) e a umidade relativa está *altíssima* e só te esperando para _chafurdar na senaita_ 😈.`,`Agora em Vagina/BR está atualmente ${randomIntFromInterval(36,40)}°C 🌡️ (sensação térmica de ${randomIntFromInterval(36,40)}°C) e a umidade relativa está *BAIXÍSSIMA* depois de ver essa tua foto de perfil 🤮.`,`Agora em Vagina/BR está atualmente ${randomIntFromInterval(36,40)}°C 🌡️ (sensação térmica de ${randomIntFromInterval(36,40)}°C) e a umidade relativa está *altíssima* e só te esperando para _chafurdar na senaita_ 😈.`,`Agora em Vagina/BR está atualmente ${randomIntFromInterval(36,40)}°C 🌡️ (sensação térmica de ${randomIntFromInterval(36,40)}°C) e a umidade relativa está *BAIXÍSSIMA* depois de ver essa tua foto de perfil 🤮.`]
	}
	
	if (["vagina", "buceta","pepeca"].some(c => cityName.toLowerCase().includes(c))){
		retorno.push({msg: randomFromArray(climaFixo.vagina), react: "😳", reply: true});
	} else {
		cityName = removeAccents(cityName);

		const resCity = await searchCityWeather(cityName)
		loggerInfo(`[getClimaByLocation][${msg.from}/${msg.author}][${cityName}] ${JSON.stringify(resCity)}`);

		if(resCity.success && resCity.locales){

			const firstCity = resCity.locales[0]


			const weather = await weatherNow(firstCity.latitude, firstCity.longitude)
			const sunrise = new Date(`${weather.current?.sunriseTimeLocal}`).toLocaleTimeString("pt-br").substring(0, 5)
			const sunset = new Date(`${weather.current?.sunsetTimeLocal}`).toLocaleTimeString("pt-br").substring(0, 5)
			
			loggerInfo(`[getClimaByLocation][${msg.from}/${msg.author}][${cityName}] Resultado:\n${JSON.stringify(weather)}`);
			const proximosDias = weather.dailyWeather ? "\n⏭ *Próximos Dias:*\n   "+weather.dailyWeather.slice(1).map(w => `_${w.dayOfWeek.replace("-feira","")}_ - ${w.narrative}`).join("\n   ") : "";

			const formattedMessage = `🌤️ _${firstCity.address}_ - *${weather.current?.cloudCoverPhrase ?? "Normal"}*, sensação térmica de ${weather?.current?.temperatureFeelsLike}°C.

🍛 *Agora, ${weather.current.dayOfWeek.replace("-feira","")}:*
   🗣 ${weather?.dailyWeather[0]?.narrative}
   🌡️ ${weather?.current?.temperature}°C (${weather?.current?.temperatureMin24Hour}°C~${weather?.current?.temperatureMax24Hour}°C)
   💧 ${weather?.current?.relativeHumidity}%
   🌬️ ${weather.current?.windSpeed} km/h (${weather?.current?.windDirectionCardinal})
   🌅 ${sunrise} / 🌇 ${sunset}
${proximosDias}

📅 _${new Date(`${weather.current?.validTimeLocal}`).toLocaleString()}_`;

			retorno.push({msg: formattedMessage, react: "🌥️", reply: true});
		} else{
			retorno.push({msg: `Erro buscando clima! Cidade '${cityName}'?`, react: "❌", reply: true});
		}
	}

	return retorno;
}

// (async ()=>{
// 	const r = await getClimaByLocation("santa maria", {from: "123", author: "1234"});
// 	console.log(r[0].msg);
// })()

module.exports = { getClimaByLocation };