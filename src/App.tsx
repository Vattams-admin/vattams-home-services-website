2026-08-12T22:00:20.865467Z	Cloning repository...
2026-08-12T22:00:21.84615Z	From https://github.com/Vattams-admin/vattams-home-services-website
2026-08-12T22:00:21.846518Z	 * branch            5bc6d761c236dbc6ae29119d4a3fcb49ba569536 -> FETCH_HEAD
2026-08-12T22:00:21.846667Z	
2026-08-12T22:00:21.910953Z	HEAD is now at 5bc6d76 Update App.tsx
2026-08-12T22:00:21.912217Z	
2026-08-12T22:00:21.970091Z	
2026-08-12T22:00:21.970811Z	Using v2 root directory strategy
2026-08-12T22:00:21.989713Z	Success: Finished cloning repository files
2026-08-12T22:00:24.05685Z	Checking for configuration in a Wrangler configuration file (BETA)
2026-08-12T22:00:24.057365Z	
2026-08-12T22:00:24.225099Z	No Wrangler configuration file found. Continuing.
2026-08-12T22:00:25.064431Z	Detected the following tools from environment: npm@10.9.2, nodejs@22.16.0
2026-08-12T22:00:25.064981Z	Installing project dependencies: npm clean-install --progress=false
2026-08-12T22:02:12.132511Z	
2026-08-12T22:02:12.132881Z	added 401 packages, and audited 402 packages in 2m
2026-08-12T22:02:12.132961Z	
2026-08-12T22:02:12.133002Z	67 packages are looking for funding
2026-08-12T22:02:12.133038Z	  run `npm fund` for details
2026-08-12T22:02:13.009606Z	
2026-08-12T22:02:13.00997Z	28 vulnerabilities (2 low, 13 moderate, 13 high)
2026-08-12T22:02:13.010056Z	
2026-08-12T22:02:13.01011Z	To address issues that do not require attention, run:
2026-08-12T22:02:13.010157Z	  npm audit fix
2026-08-12T22:02:13.010203Z	
2026-08-12T22:02:13.010249Z	To address all issues (including breaking changes), run:
2026-08-12T22:02:13.010296Z	  npm audit fix --force
2026-08-12T22:02:13.010343Z	
2026-08-12T22:02:13.010383Z	Run `npm audit` for details.
2026-08-12T22:02:13.110964Z	Executing user command: npm run build
2026-08-12T22:02:13.394427Z	
2026-08-12T22:02:13.3953Z	> vite-react-typescript-starter@0.0.0 build
2026-08-12T22:02:13.395428Z	> vite build
2026-08-12T22:02:13.395509Z	
2026-08-12T22:02:13.641715Z	[36mvite v5.4.8 [32mbuilding for production...[36m[39m
2026-08-12T22:02:13.698251Z	transforming...
2026-08-12T22:02:13.963242Z	Browserslist: caniuse-lite is outdated. Please run:
2026-08-12T22:02:13.963576Z	  npx update-browserslist-db@latest
2026-08-12T22:02:13.96372Z	  Why you should do it regularly: https://github.com/browserslist/update-db#readme
2026-08-12T22:02:14.871896Z	[32m✓[39m 46 modules transformed.
2026-08-12T22:02:14.874732Z	[31mx[39m Build failed in 1.21s
2026-08-12T22:02:14.875221Z	[31merror during build:
2026-08-12T22:02:14.875334Z	[31m[vite:esbuild] Transform failed with 1 error:
2026-08-12T22:02:14.875406Z	/opt/buildhome/repo/src/pages/tuition/TuitionBooking.tsx:223:28: ERROR: Expected ":" but found "details"[31m
2026-08-12T22:02:14.87551Z	file: [36m/opt/buildhome/repo/src/pages/tuition/TuitionBooking.tsx:223:28[31m
2026-08-12T22:02:14.875568Z	[33m
2026-08-12T22:02:14.875645Z	[33mExpected ":" but found "details"[33m
2026-08-12T22:02:14.87571Z	221|            <p className="text-purple-100 text-base max-w-2xl">
2026-08-12T22:02:14.875783Z	222|              {resolvedCourse
2026-08-12T22:02:14.875856Z	223|                ? Fill in the details below to book a session for ${resolvedCourse.name}.
2026-08-12T22:02:14.875945Z	   |                              ^
2026-08-12T22:02:14.875999Z	224|                : 'Fill in the details below and our team will get in touch to schedule your session.'}
2026-08-12T22:02:14.876081Z	225|            </p>
2026-08-12T22:02:14.876138Z	[31m
2026-08-12T22:02:14.876291Z	    at failureErrorWithLog (/opt/buildhome/repo/node_modules/esbuild/lib/main.js:1472:15)
2026-08-12T22:02:14.876357Z	    at /opt/buildhome/repo/node_modules/esbuild/lib/main.js:755:50
2026-08-12T22:02:14.876402Z	    at responseCallbacks.<computed> (/opt/buildhome/repo/node_modules/esbuild/lib/main.js:622:9)
2026-08-12T22:02:14.876454Z	    at handleIncomingPacket (/opt/buildhome/repo/node_modules/esbuild/lib/main.js:677:12)
2026-08-12T22:02:14.876508Z	    at Socket.readFromStdout (/opt/buildhome/repo/node_modules/esbuild/lib/main.js:600:7)
2026-08-12T22:02:14.876611Z	    at Socket.emit (node:events:518:28)
2026-08-12T22:02:14.880202Z	    at addChunk (node:internal/streams/readable:561:12)
2026-08-12T22:02:14.88031Z	    at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
2026-08-12T22:02:14.880362Z	    at Readable.push (node:internal/streams/readable:392:5)
2026-08-12T22:02:14.880417Z	    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)[39m
2026-08-12T22:02:14.914386Z	Failed: Error while executing user command. Exited with error code: 1
2026-08-12T22:02:14.920912Z	Failed: build command exited with code: 1
2026-08-12T22:02:15.679413Z	Failed: error occurred while running build command