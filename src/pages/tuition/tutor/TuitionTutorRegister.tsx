2026-08-13T17:36:34.840495Z	Cloning repository...
2026-08-13T17:36:35.748169Z	From https://github.com/Vattams-admin/vattams-home-services-website
2026-08-13T17:36:35.748463Z	 * branch            c8f5b7a1e75bf0041251fef736959278d2450fe1 -> FETCH_HEAD
2026-08-13T17:36:35.748549Z	
2026-08-13T17:36:35.807036Z	HEAD is now at c8f5b7a Create TuitionTutorRegister.tsx
2026-08-13T17:36:35.807421Z	
2026-08-13T17:36:35.859537Z	
2026-08-13T17:36:35.85983Z	Using v2 root directory strategy
2026-08-13T17:36:35.875717Z	Success: Finished cloning repository files
2026-08-13T17:36:37.812446Z	Checking for configuration in a Wrangler configuration file (BETA)
2026-08-13T17:36:37.812841Z	
2026-08-13T17:36:37.94675Z	No Wrangler configuration file found. Continuing.
2026-08-13T17:36:38.256319Z	Detected the following tools from environment: npm@10.9.2, nodejs@22.16.0
2026-08-13T17:36:38.2568Z	Installing project dependencies: npm clean-install --progress=false
2026-08-13T17:38:09.922221Z	
2026-08-13T17:38:09.92293Z	added 401 packages, and audited 402 packages in 2m
2026-08-13T17:38:09.923089Z	
2026-08-13T17:38:09.92317Z	67 packages are looking for funding
2026-08-13T17:38:09.923222Z	  run `npm fund` for details
2026-08-13T17:38:10.902241Z	
2026-08-13T17:38:10.902646Z	28 vulnerabilities (2 low, 13 moderate, 13 high)
2026-08-13T17:38:10.902739Z	
2026-08-13T17:38:10.902829Z	To address issues that do not require attention, run:
2026-08-13T17:38:10.902892Z	  npm audit fix
2026-08-13T17:38:10.902925Z	
2026-08-13T17:38:10.902957Z	To address all issues (including breaking changes), run:
2026-08-13T17:38:10.902989Z	  npm audit fix --force
2026-08-13T17:38:10.903018Z	
2026-08-13T17:38:10.903049Z	Run `npm audit` for details.
2026-08-13T17:38:11.010496Z	Executing user command: npm run build
2026-08-13T17:38:11.266284Z	
2026-08-13T17:38:11.266722Z	> vite-react-typescript-starter@0.0.0 build
2026-08-13T17:38:11.26686Z	> vite build
2026-08-13T17:38:11.266931Z	
2026-08-13T17:38:11.636409Z	[36mvite v5.4.8 [32mbuilding for production...[36m[39m
2026-08-13T17:38:11.686672Z	transforming...
2026-08-13T17:38:11.920477Z	Browserslist: caniuse-lite is outdated. Please run:
2026-08-13T17:38:11.921422Z	  npx update-browserslist-db@latest
2026-08-13T17:38:11.921638Z	  Why you should do it regularly: https://github.com/browserslist/update-db#readme
2026-08-13T17:38:12.711877Z	[32m✓[39m 43 modules transformed.
2026-08-13T17:38:12.713683Z	[31mx[39m Build failed in 1.05s
2026-08-13T17:38:12.714133Z	[31merror during build:
2026-08-13T17:38:12.714531Z	[31m[vite:esbuild] Transform failed with 1 error:
2026-08-13T17:38:12.714642Z	/opt/buildhome/repo/src/pages/tuition/student/TuitionStudentClasses.tsx:158:53: ERROR: Expected "}" but found "{"[31m
2026-08-13T17:38:12.714739Z	file: [36m/opt/buildhome/repo/src/pages/tuition/student/TuitionStudentClasses.tsx:158:53[31m
2026-08-13T17:38:12.714893Z	[33m
2026-08-13T17:38:12.714966Z	[33mExpected "}" but found "{"[33m
2026-08-13T17:38:12.715036Z	156|            <div className="space-y-8">
2026-08-13T17:38:12.715251Z	157|              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
2026-08-13T17:38:12.715343Z	158|                <StatCard label="Attendance %" value={${summary.attendancePercentage}%} icon={TrendingUp} tone="purple" />
2026-08-13T17:38:12.715418Z	   |                                                       ^
2026-08-13T17:38:12.715497Z	159|                <StatCard label="Present" value={summary.present} icon={CheckCircle2} tone="emerald" />
2026-08-13T17:38:12.715567Z	160|                <StatCard label="Absent" value={summary.absent} icon={XCircle} tone="red" />
2026-08-13T17:38:12.71563Z	[31m
2026-08-13T17:38:12.715689Z	    at failureErrorWithLog (/opt/buildhome/repo/node_modules/esbuild/lib/main.js:1472:15)
2026-08-13T17:38:12.71575Z	    at /opt/buildhome/repo/node_modules/esbuild/lib/main.js:755:50
2026-08-13T17:38:12.715816Z	    at responseCallbacks.<computed> (/opt/buildhome/repo/node_modules/esbuild/lib/main.js:622:9)
2026-08-13T17:38:12.715876Z	    at handleIncomingPacket (/opt/buildhome/repo/node_modules/esbuild/lib/main.js:677:12)
2026-08-13T17:38:12.715933Z	    at Socket.readFromStdout (/opt/buildhome/repo/node_modules/esbuild/lib/main.js:600:7)
2026-08-13T17:38:12.715993Z	    at Socket.emit (node:events:518:28)
2026-08-13T17:38:12.716051Z	    at addChunk (node:internal/streams/readable:561:12)
2026-08-13T17:38:12.716109Z	    at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
2026-08-13T17:38:12.7162Z	    at Readable.push (node:internal/streams/readable:392:5)
2026-08-13T17:38:12.716312Z	    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)[39m
2026-08-13T17:38:12.915287Z	Failed: Error while executing user command. Exited with error code: 1
2026-08-13T17:38:12.922781Z	Failed: build command exited with code: 1
2026-08-13T17:38:13.604744Z	Failed: error occurred while running build command