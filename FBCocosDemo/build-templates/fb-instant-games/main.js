(function () {

    'use strict';

    function boot () {

        var settings = window._CCSettings;
        window._CCSettings = undefined;

        if ( !settings.debug ) {
            var uuids = settings.uuids;

            var rawAssets = settings.rawAssets;
            var assetTypes = settings.assetTypes;
            var realRawAssets = settings.rawAssets = {};
            for (var mount in rawAssets) {
                var entries = rawAssets[mount];
                var realEntries = realRawAssets[mount] = {};
                for (var id in entries) {
                    var entry = entries[id];
                    var type = entry[1];
                    // retrieve minified raw asset
                    if (typeof type === 'number') {
                        entry[1] = assetTypes[type];
                    }
                    // retrieve uuid
                    realEntries[uuids[id] || id] = entry;
                }
            }

            var scenes = settings.scenes;
            for (var i = 0; i < scenes.length; ++i) {
                var scene = scenes[i];
                if (typeof scene.uuid === 'number') {
                    scene.uuid = uuids[scene.uuid];
                }
            }

            var packedAssets = settings.packedAssets;
            for (var packId in packedAssets) {
                var packedIds = packedAssets[packId];
                for (var j = 0; j < packedIds.length; ++j) {
                    if (typeof packedIds[j] === 'number') {
                        packedIds[j] = uuids[packedIds[j]];
                    }
                }
            }

            var subpackages = settings.subpackages;
            for (var subId in subpackages) {
                var uuidArray = subpackages[subId].uuids;
                if (uuidArray) {
                    for (var k = 0, l = uuidArray.length; k < l; k++) {
                        if (typeof uuidArray[k] === 'number') {
                            uuidArray[k] = uuids[uuidArray[k]];
                        }
                    }
                }
            }
        }

        // init engine
        var canvas;

        if (cc.sys.isBrowser) {
            canvas = document.getElementById('GameCanvas');
        }

        function setLoadingDisplay () {
            // Loading splash scene
            cc.loader.onProgress = function (completedCount, totalCount, item) {
                var progress = 100 * completedCount / totalCount;
                FBInstant.setLoadingProgress(progress);
            };
        }

        var onStart = function () {
            cc.view.resizeWithBrowserSize(true);
            cc.view.enableRetina(true);
            if (cc.sys.isBrowser) {
                setLoadingDisplay();
            }

            if (cc.sys.isMobile) {
                if (settings.orientation === 'landscape') {
                    cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
                }
                else if (settings.orientation === 'portrait') {
                    cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
                }
                // qq, wechat, baidu
                cc.view.enableAutoFullScreen(
                    cc.sys.browserType !== cc.sys.BROWSER_TYPE_BAIDU &&
                    cc.sys.browserType !== cc.sys.BROWSER_TYPE_WECHAT &&
                    cc.sys.browserType !== cc.sys.BROWSER_TYPE_MOBILE_QQ
                );
                // cc.view.enableAutoFullScreen(
                //     false
                // );                
            }

            // Limit downloading max concurrent task to 2,
            // more tasks simultaneously may cause performance draw back on some android system / brwosers.
            // You can adjust the number based on your own test result, you have to set it before any loading process to take effect.
            if (cc.sys.isBrowser && cc.sys.os === cc.sys.OS_ANDROID) {
                cc.macro.DOWNLOAD_MAX_CONCURRENT = 2;
            }

            var launchScene = settings.launchScene;
            cc.director.preloadScene(launchScene,
                function () {
                    // Once all assets are loaded, tells the SDK
                    // to end loading view and start the game
                    FBInstant.startGameAsync()
                    .then(function () {
                        try{
                            if(cc && cc.view && cc.view.enableAutoFullScreen){
                                console.info("disable auto full screen");
                                cc.view.enableAutoFullScreen(
                                    false
                                );    
                            }
                        }catch(e){

                        }
                        // 记录fb游戏启动事件
                        // gtag("event", "fb_started");

                        // Retrieving context and player information can only be done
                        // once startGameAsync() resolves
                        cc.director.loadScene(launchScene,
                            function () {
                                console.log('Success to load scene: ' + launchScene);
                                cc.loader.onProgress = null;
                            }
                        );
                    })
                    .catch(function (e) { cc.error(e); });
                }
            );
        };

        // jsList
        var jsList = settings.jsList;
        var bundledScript = settings.debug ? 'src/project.dev.js' : 'src/project.js';
        if (jsList) {
            jsList = jsList.map(function (x) { return 'src/' + x; });
            jsList.push(bundledScript);
        }
        else {
            jsList = [bundledScript];
        }

        var option = {
            //width: width,
            //height: height,
            id: 'GameCanvas',
            scenes: settings.scenes,
            debugMode: settings.debug ? cc.debug.DebugMode.INFO : cc.debug.DebugMode.ERROR,
            showFPS: settings.debug,
            frameRate: 60,
            jsList: jsList,
            groupList: settings.groupList,
            collisionMatrix: settings.collisionMatrix,
        };

        // init assets
        cc.AssetLibrary.init({
            libraryPath: 'res/import',
            rawAssetsBase: 'res/raw-',
            rawAssets: settings.rawAssets,
            packedAssets: settings.packedAssets,
            md5AssetsMap: settings.md5AssetsMap,
            subpackages: settings.subpackages
        });
        
        cc.game.run(option, onStart);
    }

    if (window.document) {
        var cocos2d = document.createElement('script');
        cocos2d.async = true;
        cocos2d.src = window._CCSettings.debug ? 'cocos2d-js.js' : 'cocos2d-js-min.js';

        var engineLoaded = function () {           
            FBInstant.initializeAsync()
                .then(function () {
                    // 设置user_id(后续所有事件都会带这个参数)
                    // const user_id = FBInstant.player.getID();
                    // gtag('config', 'G-3GR92PZZQ8', { 
                    //     cookie_flags: 'max-age=7200;secure;samesite=none',
                    //     "user_id": user_id
                    // });

                    // gtag("set", {
                    //     "user_id": user_id
                    // });

                    // 记录初始化成功事件
                    // gtag("event", "fb_inited");

                    // 记录启动来源
                    FBInstant.getEntryPointAsync().then(function(entry){
                        // console.info("Entry Point: ", entry);
                        // gtag("event", "fb_entrypoint", {
                        //     entrypoint:entry
                        // });
                    });

                    // 记录会话类型
                    const contextType = FBInstant.context.getType();
                    // gtag("event", "fb_context", {type: contextType});
                    
                    document.body.removeChild(cocos2d);
                    cocos2d.removeEventListener('load', engineLoaded, false);
                    if (typeof VConsole !== 'undefined') {
                        window.vConsole = new VConsole();
                    }
                    boot();
                });
        };
        cocos2d.addEventListener('load', engineLoaded, false);
        document.body.appendChild(cocos2d);
    }

})();
