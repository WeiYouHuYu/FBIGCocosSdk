const FB_MAX_AD_INSTANCE = 3;  
const FB_INIT_AD_COUNT = 3;     

const FB_BANNER_REFRESH_INTERVAL = 30+10; 
const FB_INTERSTITIAL_REFRESH_INTERVAL = 30+10; 
const FB_REWARDED_VIDEO_REFRESH_INTERVAL = 0;   

const FB_MAX_BANNER_ERROR = 1;     
const FB_MAX_INTERSTITIAL_ERROR = 3;   
const FB_MAX_REWARDED_VIDEO_ERROR = 3;  

const FB_AUTO_LOAD_ON_PLAY = true;   
const FB_AUTO_RELOAD_DELAY = 1;      

const FB_AD_DELAY_FOR_FIRST_BANNER = 0; 
const FB_AD_DELAY_FOR_FIRST_INTERSTITIAL = 30;  
const FB_AD_DELAY_FOR_FIRST_REWARDED_VIDEO = 0; 

enum FB_AD_TYPE{
    INTERSTITIAL = 0,
    REWARDED_VIDEO = 1,
    BANNER = 2
}

enum FB_AD_STATE{
    NONE,
    NEW,
    LOADING,
    LOADED,
    PLAYING
}

function getStateName(state:FB_AD_STATE){
    let str = "NONE";
    switch(state){
        case FB_AD_STATE.NEW:
            str = "NEW";
            break;
        case FB_AD_STATE.LOADING:
            str = "LOADING";
            break;
        case FB_AD_STATE.LOADED:
            str = "LOADED";
            break;
        case FB_AD_STATE.PLAYING:
            str = "PLAYING";
            break;
    }

    return str;
}

async function waitTimeSecond(timeoutSecond:number, callback?) {
    return new Promise<void>((resolve, reject)=>{
        setTimeout(()=>{
            try{                
                if(callback){
                    callback();
                }
                resolve();    
            }catch(e){
                reject(e);
            }
        }, timeoutSecond * 1000);
    });
}

interface FB_ERROR{
    code: string;
    message: string;
}

const ErrorTooManyAdInstance:FB_ERROR = {
    code: "EXCEED_MAX_AD_INSTANCE",
    message: "Max AD Instance allowed: " + FB_MAX_AD_INSTANCE
}

const ErrorNoReadyAdInstance:FB_ERROR = {
    code: "NO_READY_AD_INSTANCE",
    message: "AD Instance Not Ready or Played too frequently"
}

const ErrorNotReadyForLoad:FB_ERROR = {
    code: "NOT_READY_FOR_LOAD",
    message: "Not Ready for Load"
}

const ErrorAdIsLoading:FB_ERROR = {
    code: "AD_IS_LOADING",
    message: "AD is Loading"
}

const ErrorNotReadyForPlay:FB_ERROR = {
    code: "NOT_READY_FOR_PLAYING",
    message: "Not Ready for Playing"
}

const ErrorAdIsPlaying:FB_ERROR = {
    code: "AD_IS_PLAYING",
    message: "AD is Playing"
}

const ErrorNoBannerAdInstance:FB_ERROR = {
    code: "NO_BANNER_AD",
    message: "No Banner Ad Instance"
}

const ErrorApiNotSupport:FB_ERROR = {
    code: "API_NOT_SUPPORT",
    message: "API Not Support"
}

const ErrorTooFastShow:FB_ERROR = {
    code: "TOO_FAST_SHOW",
    message: "Too Fast To Show Ads"
}

const ErrorNotPlaying:FB_ERROR = {
    code: "NOT_PLAYING",
    message: "Ads Not Playing"
}

const ErrorTooManyErrors:FB_ERROR = {
    code: "TOO_MANY_ERRORS",
    message: "Too Many Errors, Stop Next Action"
}

const FB_API_BANNER = "loadBannerAdAsync";

const FB_ERROR_CODE_RATE_LIMITED = "RATE_LIMITED";
const FB_ERROR_CLIENT_UNSUPPORTED_OPERATION = "CLIENT_UNSUPPORTED_OPERATION";
const FB_ERROR_ADS_NO_FILL = "ADS_NO_FILL";

// state : NONE -> NEW -> LOADING -> LOADED -> SHOWING -> (SHOWED) NONE

interface FBAdOption{
    autoLoadOnPlay: boolean,
    maxLoadError: number,      // max load error allowed
}

interface AdTimerOption{
    refreshInterval: number,   
    delayForFirstAd: number,   
}

function getOption(opt:FBAdOption, key:string, defaultValue:any){
    if(opt && typeof(opt[key])!= "undefined") {
        return opt[key];
    }

    return defaultValue;
}

class AdTimer{
    protected _lastShowTime:number = 0;    
    protected _refreshInterval:number = 0;    // refresh interval, <=0 means no interval

    constructor(interval:number, delay:number){
        this._refreshInterval = interval>0?interval:0;
        this._lastShowTime = 0;
        if(delay>0){
            this._lastShowTime = Date.now() + delay * 1000 - this._refreshInterval * 1000;
        }
    }

    public isReadyToRefresh(){
        return this.getNextRefreshInterval() <= 0;
    }

    public getNextRefreshInterval(){
        let refreshInterval = 0;

        if(this._refreshInterval>0 && this._lastShowTime > 0){
            let currentTime = Date.now();
            refreshInterval = this._refreshInterval - (currentTime - this._lastShowTime)/1000;
        }

        return refreshInterval;
    }

    public updateLastShowTime(){
        this._lastShowTime = Date.now();
    }
}

class FBAdUnitBase{
    protected _state:FB_AD_STATE;
    protected _adId:string;
    protected _type:FB_AD_TYPE;

    protected _maxLoadError:number = 0;
    protected _errorCounter:number = 0;
    protected _fatalError:boolean = false;

    protected _sharedTimer:AdTimer = null;

    constructor(id:string, type:FB_AD_TYPE, sharedTimer:AdTimer, opt?:FBAdOption){
        this._adId = id;
        this._state = FB_AD_STATE.NONE;
        this._type = type;
        this._sharedTimer = sharedTimer;

        this._fatalError = false;
        console.assert(!!sharedTimer, "sharedTimer is invalid", sharedTimer);

        // this._refreshInterval = getOption(opt, "refreshInterval", 0);
        this._maxLoadError = getOption(opt, "maxLoadError", 0);

        // const delayForFirstAd = getOption(opt, "delayForFirstAd", 0);
        // if(delayForFirstAd > 0) {
        //     this._lastShowTime = Date.now() + delayForFirstAd * 1000 - this._refreshInterval * 1000;
        // }else{
        //     this._lastShowTime = 0;
        // }
    }

    public getStateName(){
        return getStateName(this._state);
    }

    public getAdTypeName(){
        if(this._type == FB_AD_TYPE.INTERSTITIAL){
            return "Interstitial";
        }
        if(this._type == FB_AD_TYPE.REWARDED_VIDEO){
            return "RewardedVideo";
        }
        if(this._type == FB_AD_TYPE.BANNER){
            return "Banner";
        }

        return "UNKNOWN";
    }

    public getInfo(){
        return `[${this.getAdTypeName()}:${this._adId}:${this.getStateName()}]`;
    }

    public isReadyToRefresh(){
        // return this.getNextRefreshInterval() <= 0;
        return this._sharedTimer.isReadyToRefresh();
    }

    public getNextRefreshInterval(){
        return this._sharedTimer.getNextRefreshInterval();
    }

    protected updateLastShowTime(){
        this._sharedTimer.updateLastShowTime();
    }

    protected increaseErrorCounter(){
        this._errorCounter++;
    }

    protected resetErrorCounter(){
        this._errorCounter = 0;
    }

    protected setFatalError(){
        this._fatalError = true;
    }

    public isErrorTooMany(){
        return this._fatalError || (this._maxLoadError>0 && this._errorCounter >= this._maxLoadError);
    }
}

// AdUnit with state
abstract class FBStatefulAdUnit extends FBAdUnitBase{
    private _adInstance:FBInstant.AdInstance;

    private _autoLoadOnPlay:boolean; // auto reload when play
    
    constructor(id:string, type:number, sharedTimer:AdTimer, opt?:FBAdOption){
        super(id, type, sharedTimer, opt);
        this._adInstance = null;
        this._autoLoadOnPlay = getOption(opt, "autoLoadOnPlay", false);
    }

    protected abstract createAdInstanceAsync(adId:string):Promise<FBInstant.AdInstance>;

    public async loadAsync(){
        // [1] get AdInstance
        if(this._adInstance == null){
            if(this._state == FB_AD_STATE.NONE){
                this._state = FB_AD_STATE.NEW;

                console.log("Get Ad Instance: " + this.getInfo());

                this._adInstance = await this.createAdInstanceAsync(this._adId);
            }else{
                console.log("Ad Instance is still creating: " + this.getInfo());
                return;
            }
        }else{
            // ad instance is ready
        }

        // [2] checking for preload
        if(this._state != FB_AD_STATE.NEW){
            // preload only on NEW
            console.log("Not ready for preload: " + this.getInfo());
            if(this._state == FB_AD_STATE.LOADING){
                console.log("Ad is loading, do not reload" + this.getInfo());
                throw ErrorAdIsLoading;
            }else{
                throw ErrorNotReadyForLoad;
            }
        }

        if(this.isErrorTooMany()){
            console.log("Too many errors, stop loading: " + this.getInfo());
            throw ErrorTooManyErrors;
        }

        try{
            // [3] loading 
            this._state = FB_AD_STATE.LOADING;

            console.log("Start Loading: " + this.getInfo());
            await this._adInstance.loadAsync();

            // [4] success
            this._state = FB_AD_STATE.LOADED;
            this.resetErrorCounter();

            console.log("Loading Success: " + this.getInfo());
            return true;
        }catch(e){
            // [5] load failed
            // FB don't need reset adInstance object, or too many objects will be created
            // this._adInstance = null;

            console.error("Loading Failed: " + this.getInfo(), e);
            if((e as FB_ERROR).code == FB_ERROR_ADS_NO_FILL){
                // NOT FILL, Stop
                console.error("Ads Not Fill, stop loading: " + this.getInfo());
                this.setFatalError();
            }else{
                this.increaseErrorCounter();
                this._state = FB_AD_STATE.NEW;
    
                // [6] other error, retry later
                let delayTime = 10 * this._errorCounter + FB_AUTO_RELOAD_DELAY;
                console.log("Reload after " + delayTime + " seconds: " + this.getInfo());
                waitTimeSecond(delayTime, this.loadAsync.bind(this)).catch(e=>{
                    console.info("Reload failed: " + this.getInfo(), e);
                });
           }

            throw e;
        }
    }

    public isReady(){
        return this._adInstance != null && this._state == FB_AD_STATE.LOADED;
    }

    public async showAsync(){
        // [1.1] check state
        if(!this.isReady()){
            console.log("Not Ready for play: " + this.getInfo());
            if(this._state == FB_AD_STATE.PLAYING){
                throw ErrorAdIsPlaying;
            }else{
                throw ErrorNotReadyForPlay;
            }
        }
        
        // [1.2] 
        if(!this.isReadyToRefresh()){
            console.log("Play too frequently, wait for " + this.getNextRefreshInterval() + " seconds: " + this.getInfo());
            throw ErrorTooFastShow;
        }

        try{
            // [2] 
            this._state = FB_AD_STATE.PLAYING;

            console.log("Play Ads: " + this.getInfo());
            await this._adInstance.showAsync();

            console.log("Play Success: " + this.getInfo());

            // [3] reset ad instance once showAsync is called
            this._adInstance = null;
            this._state = FB_AD_STATE.NONE;
            this.updateLastShowTime();

            // [4] done
            if(this._autoLoadOnPlay){
                console.log("Reload after " + FB_AUTO_RELOAD_DELAY + " seconds: " + this.getInfo());
                waitTimeSecond(FB_AUTO_RELOAD_DELAY, this.loadAsync.bind(this)).catch(e=>{
                    console.info("Reload failed: " + this.getInfo(), e);
                });
            }
            return true;
        }catch(e){
            // [5] reset ad instance once showAsync is called
            console.log("Play Failed: " + this.getInfo(), e);
            if(e.code == FB_ERROR_CODE_RATE_LIMITED){
                this._state = FB_AD_STATE.LOADED;
            }else{
                this._adInstance = null;
                this._state = FB_AD_STATE.NONE;
    
                // [6] other error, retry later
                if(this._autoLoadOnPlay){
                    console.log("Reload after " + FB_AUTO_RELOAD_DELAY + " seconds: " + this.getInfo());
                    waitTimeSecond(FB_AUTO_RELOAD_DELAY, this.loadAsync.bind(this)).catch(e=>{
                        console.info("Reload Failed: " + this.getInfo(), e);
                    });
                }    
            }

            throw e;
        }

        // return false;
    }
}

class FBInterstitialUnit extends FBStatefulAdUnit{
    constructor(id:string, sharedTimer:AdTimer, opt?:FBAdOption){
        super(id, FB_AD_TYPE.INTERSTITIAL, sharedTimer, opt);
    }

    protected async createAdInstanceAsync(adId: string){
        return await FBInstant.getInterstitialAdAsync(this._adId);
    }
}

class FBRewardedVideoUnit extends FBStatefulAdUnit{
    constructor(id:string, sharedTimer:AdTimer, opt?:FBAdOption){
        super(id, FB_AD_TYPE.REWARDED_VIDEO, sharedTimer, opt);
    }

    protected async createAdInstanceAsync(adId: string){
        return await FBInstant.getRewardedVideoAsync(this._adId);
    }
}

// NONE -> LOADING -> PLAYING -> NONE
class FBBannerUnit extends FBAdUnitBase{
    constructor(id:string, sharedTimer:AdTimer,opt?:FBAdOption){
        super(id, FB_AD_TYPE.BANNER, sharedTimer, opt);
    }

    // show banner, this interface could be called multiple times.
    public async showAsync(){
        if(!this.isReadyToRefresh()){
            console.log("Play too frequently, wait for " + this.getNextRefreshInterval() + " seconds: " + this.getInfo());
            throw ErrorTooFastShow;
        }

        if(this.isErrorTooMany()){
            console.log("Too many errors, stop: " + this.getInfo());
            throw ErrorTooManyErrors;
        }

        if(this._state == FB_AD_STATE.LOADING){
            console.info("Banner is loading, wait for it: " + this.getInfo());
            throw ErrorAdIsLoading;
        }

        try{
            this._state = FB_AD_STATE.LOADING;
            console.log("Show Banner: " + this.getInfo());
            await FBInstant.loadBannerAdAsync(this._adId);

            this._state = FB_AD_STATE.PLAYING;

            console.log("Show Banner Success: " + this.getInfo());

            this.updateLastShowTime();
            this.resetErrorCounter();
        }catch(e){
            console.error("Show Banner Failed: " + this.getInfo(), e);
            if(e.code == FB_ERROR_CODE_RATE_LIMITED){
                this._state = FB_AD_STATE.NONE;
            }else if(e.code == FB_ERROR_ADS_NO_FILL){
                console.error("Ads Not Fill, Stop: " + this.getInfo());
                this.setFatalError();
            }else{
                this.increaseErrorCounter();
                this._state = FB_AD_STATE.NONE;
            }
            
            throw e;
        }
    }

    public async hideAsync(){
        if(this._state != FB_AD_STATE.PLAYING){
            console.log("No Banner Playing: " + this.getInfo());
            throw ErrorNotPlaying;
        }

        try{
            console.log("Hide Banner: " + this.getInfo());
            await FBInstant.hideBannerAdAsync();
            this._state = FB_AD_STATE.NONE;
        }catch(e){
            console.error("Hide Banner Failed: " + this.getInfo(), e);
          
            // this._state = FB_AD_STATE.NONE;
            throw e;
        }
    }
}

export default class FBAdManager{
    public static getVersion(){
        return "1.0.4";
    }

    private static _interstitialAds:Array<FBStatefulAdUnit> = [];
    private static _rewardedVideos:Array<FBStatefulAdUnit> = [];
    private static _banners:Array<FBBannerUnit> = [];

    private static _interstitialTimer:AdTimer = null;
    private static _rewardedVideoTimer:AdTimer = null;
    private static _bannerTimer:AdTimer = null;

    private static _bannerSupport = undefined;

    public static defaultInterstitialOption:FBAdOption = {
        autoLoadOnPlay: FB_AUTO_LOAD_ON_PLAY,
        maxLoadError: FB_MAX_INTERSTITIAL_ERROR,
    };

    public static defaultRewardedVideoOption:FBAdOption = {
        autoLoadOnPlay: FB_AUTO_LOAD_ON_PLAY,
        maxLoadError: FB_MAX_REWARDED_VIDEO_ERROR,
    };
    
    public static defaultBannerOption:FBAdOption = {
        autoLoadOnPlay: FB_AUTO_LOAD_ON_PLAY, // no need
        maxLoadError: FB_MAX_BANNER_ERROR,
    };

    public static defaultInterstitialTimerOption:AdTimerOption = {
        refreshInterval: FB_INTERSTITIAL_REFRESH_INTERVAL,
        delayForFirstAd: FB_AD_DELAY_FOR_FIRST_INTERSTITIAL
    };

    public static defaultRewardedVideoTimerOption:AdTimerOption = {
        refreshInterval: FB_REWARDED_VIDEO_REFRESH_INTERVAL,
        delayForFirstAd: FB_AD_DELAY_FOR_FIRST_REWARDED_VIDEO
    };
    
    public static defaultBannerTimerOption:AdTimerOption = {
        refreshInterval: FB_BANNER_REFRESH_INTERVAL,
        delayForFirstAd: FB_AD_DELAY_FOR_FIRST_BANNER
    };

    // 1.1. add interstitial
    public static addInterstitial(id:string, count:number=FB_INIT_AD_COUNT){
        if(this._interstitialTimer == null){
            this._interstitialTimer = new AdTimer(this.defaultInterstitialTimerOption.refreshInterval, this.defaultInterstitialTimerOption.delayForFirstAd);
        }

        for(let i=0;i<count;i++){
            if(this._interstitialAds.length >= FB_MAX_AD_INSTANCE){
                console.log("Fail to add interstitial, too many instances: " + this._interstitialAds.length, id);
                throw ErrorTooManyAdInstance;
            }
    
            let adUnit = new FBInterstitialUnit(id, this._interstitialTimer, this.defaultInterstitialOption);
    
            this._interstitialAds.push(adUnit);
            console.log("Add Interstitial: " + id, "count: " + this._interstitialAds.length);    
        }

        return this._interstitialAds.length;
    }

    // 1.2. add rewarded video
    public static addRewardedVideo(id:string, count:number=FB_INIT_AD_COUNT){
        if(this._rewardedVideoTimer == null){
            this._rewardedVideoTimer = new AdTimer(this.defaultRewardedVideoTimerOption.refreshInterval, this.defaultRewardedVideoTimerOption.delayForFirstAd);
        }

        for(let i=0;i<count;i++){
            if(this._rewardedVideos.length >= FB_MAX_AD_INSTANCE){
                console.log("Fail to add RewardedVideo, too many instances: " + this._rewardedVideos.length, id);
                throw ErrorTooManyAdInstance;
            }
            
            let adUnit = new FBRewardedVideoUnit(id, this._rewardedVideoTimer, this.defaultRewardedVideoOption);
            this._rewardedVideos.push(adUnit);
            console.log("Add RewardedVideo: " + id, "count: " + this._rewardedVideos.length);
        }

        return this._rewardedVideos.length;
    }

    // 1.3. Add Banner
    public static addBanner(id:string){
        if(this._bannerTimer == null){
            this._bannerTimer = new AdTimer(this.defaultBannerTimerOption.refreshInterval, this.defaultBannerTimerOption.delayForFirstAd);
        }

        let adUnit = new FBBannerUnit(id, this._bannerTimer, this.defaultBannerOption);
        this._banners.push(adUnit);
        console.log("Add Banner: " + id, "count: " + this._banners.length);

        return adUnit;
    }

    // Deprecate, use loadAllAsync instead
    public static async loadAll(){
        return await this.loadAllAsync();
    }

    // 2. init and preload
    public static async loadAllAsync(){
        console.log("FBAdManager Version: " + this.getVersion());
        console.log("Init Ads Queue");

        for(let i=0;i<this._rewardedVideos.length;i++){
            const adUnit = this._rewardedVideos[i];
            if(i>0){
                await waitTimeSecond(0.1);
            }           
            try{
                await adUnit.loadAsync();
            }catch(e){
                
            }
        }

        for(let i=0;i<this._interstitialAds.length;i++){
            const adUnit = this._interstitialAds[i];
            if(i>0){
                await waitTimeSecond(0.1);
            }           
            try{
                await adUnit.loadAsync();
            }catch(e){

            }
        }
    }

    private static _isAdReady(type: FB_AD_TYPE){
        let adUnits = (type == FB_AD_TYPE.INTERSTITIAL)?this._interstitialAds:this._rewardedVideos;
        let isReady = false;
        for(let i=0;i<adUnits.length;i++){
            const adUnit = adUnits[i];
            if(adUnit.isReady() && adUnit.isReadyToRefresh()){
                isReady = true;
                break;
            }
        }

        return isReady;
    }

    private static _showAsync(type: FB_AD_TYPE){
        let adUnits = (type == FB_AD_TYPE.INTERSTITIAL)?this._interstitialAds:this._rewardedVideos;
        let readyUnit:FBStatefulAdUnit = null;

        for(let i=0;i<adUnits.length;i++){
            const adUnit = adUnits[i];
            if(adUnit.isReady() && adUnit.isReadyToRefresh()){
                readyUnit = adUnit;
                break;
            }
        }

        if(readyUnit != null){
            return readyUnit.showAsync();
        }

        throw ErrorNoReadyAdInstance;
    }

    private static _getAdTimer(type: FB_AD_TYPE){
        if(type == FB_AD_TYPE.INTERSTITIAL){
            return this._interstitialTimer;
        }
        if(type == FB_AD_TYPE.REWARDED_VIDEO){
            return this._rewardedVideoTimer;
        }
        return this._bannerTimer;
    }

    // 3.1. 
    public static isInterstitialAdReady(){
        return this._isAdReady(FB_AD_TYPE.INTERSTITIAL);
    }

    // 4.1. 
    public static async showInterstitialAd(){
        return await this._showAsync(FB_AD_TYPE.INTERSTITIAL);
    }

    // 3.2. 
    public static isRewardedVideoReady(){
        return this._isAdReady(FB_AD_TYPE.REWARDED_VIDEO);
    }

    // 4.2. 
    public static async showRewardedVideo(){
        return await this._showAsync(FB_AD_TYPE.REWARDED_VIDEO);
    }

    // 6. 
    public static checkApiSupport(api:string){
        if(FBInstant.getSupportedAPIs().indexOf(api) >= 0){
            return true;
        }
        else{
            return false;
        }
    }

    // 6.1. 
    public static isBannerSupport(){
        if(typeof this._bannerSupport == "undefined"){
            this._bannerSupport = this.checkApiSupport(FB_API_BANNER);   
        }

        return this._bannerSupport;
    }

    // 3.3. 
    public static isBannerReady(){
        if(this._banners.length <= 0){
            throw ErrorNoBannerAdInstance;
        }

        let adUnit = this._banners[0];
        return adUnit.isReadyToRefresh();
    }

    // 4.3. 
    public static async showBannerAsync(){
        if(!this.isBannerSupport()){
            throw ErrorApiNotSupport;
        }

        if(this._banners.length <= 0){
            throw ErrorNoBannerAdInstance;
        }

        let adUnit = this._banners[0];
        return await adUnit.showAsync();
    }

    // 5.3. 
    public static async hideBannerAsync(){
        if(!this.isBannerSupport()){
            throw ErrorApiNotSupport;
        }

        if(this._banners.length <= 0){
            throw ErrorNoBannerAdInstance;
        }

        let adUnit = this._banners[0];
        return await adUnit.hideAsync();
    }
}