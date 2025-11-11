// biome-ignore lint: Express route handlers naturally don't return values explicitly
import express, { Express, Request, Response } from "express";
import https from "https";
import fs from "fs";

/**
 * Minimal Express server for handling OAuth redirects
 * This is NOT a full web dashboard - just handles Spotify/Last.fm OAuth callbacks
 */
export function startOAuthHandler() {
	const app: Express = express();
	const PORT = process.env.WEB_PORT || 3000;

	// Simple HTML page to display authorization code
	app.get("/auth/spotify/callback", (_req: Request, res: Response) => {
		const code = _req.query.code as string;
		const error = _req.query.error as string;

		if (error) {
			res.send(`
				<!DOCTYPE html>
				<html>
					<head>
						<title>Spotify Authorization Failed</title>
						<style>
							body { font-family: Arial; background: #1DB954; color: white; padding: 50px; text-align: center; }
							.container { background: rgba(0,0,0,0.3); padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
							h1 { color: #ff0000; }
							code { background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px; display: block; margin: 10px 0; }
						</style>
					</head>
					<body>
						<div class="container">
							<h1>❌ Authorization Failed</h1>
							<p><strong>Error:</strong> ${error}</p>
							<p>Please try again or contact support.</p>
						</div>
					</body>
				</html>
			`);
			return;
		}

		if (!code) {
			res.send(`
				<!DOCTYPE html>
				<html>
					<head>
						<title>Authorization Failed</title>
						<style>
							body { font-family: Arial; background: #1DB954; color: white; padding: 50px; text-align: center; }
							.container { background: rgba(0,0,0,0.3); padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
							h1 { color: #ff0000; }
						</style>
					</head>
					<body>
						<div class="container">
							<h1>❌ No Authorization Code</h1>
							<p>Authorization code not found. Please try again.</p>
						</div>
					</body>
				</html>
			`);
			return;
		}

		// Success - display the code
		res.send(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>Spotify Authorization Successful</title>
					<style>
						body { 
							font-family: Arial; 
							background: linear-gradient(135deg, #1DB954 0%, #1aa34a 100%);
							color: white; 
							padding: 50px; 
							text-align: center;
							margin: 0;
						}
						.container { 
							background: rgba(0,0,0,0.3); 
							padding: 40px; 
							border-radius: 10px; 
							max-width: 600px; 
							margin: 0 auto;
							backdrop-filter: blur(10px);
						}
						h1 { color: #fff; margin: 0 0 20px 0; }
						p { font-size: 16px; margin: 10px 0; }
						.code-section {
							background: rgba(0,0,0,0.5);
							padding: 20px;
							border-radius: 8px;
							margin: 20px 0;
						}
						.code {
							background: rgba(255,255,255,0.1);
							padding: 15px;
							border-radius: 5px;
							font-family: monospace;
							font-size: 14px;
							word-break: break-all;
							user-select: all;
							cursor: copy;
							color: #1DB954;
							font-weight: bold;
						}
						.instructions {
							text-align: left;
							background: rgba(0,0,0,0.3);
							padding: 15px;
							border-radius: 5px;
							margin-top: 20px;
							font-size: 14px;
						}
						.instructions ol {
							margin: 10px 0;
							padding-left: 20px;
						}
						.instructions li {
							margin: 8px 0;
						}
						.step-number {
							display: inline-block;
							background: #1DB954;
							color: black;
							width: 24px;
							height: 24px;
							border-radius: 50%;
							text-align: center;
							line-height: 24px;
							font-weight: bold;
							margin-right: 8px;
						}
						button {
							background: #1DB954;
							color: black;
							border: none;
							padding: 10px 20px;
							border-radius: 5px;
							font-weight: bold;
							cursor: pointer;
							margin-top: 10px;
							font-size: 14px;
						}
						button:hover {
							background: #1ed760;
						}
					</style>
				</head>
				<body>
					<div class="container">
						<h1>✅ Authorization Successful!</h1>
						<p>Your Spotify account has been authorized.</p>
						
						<div class="code-section">
							<p><strong>Your Authorization Code:</strong></p>
							<div class="code" onclick="copyCode(this)">${code}</div>
							<button onclick="copyCode(document.querySelector('.code'))">📋 Copy Code</button>
						</div>

						<div class="instructions">
							<strong>Next Steps:</strong>
							<ol>
								<li><span class="step-number">1</span>Copy the code above (click the code or button)</li>
								<li><span class="step-number">2</span>Go back to Discord</li>
								<li><span class="step-number">3</span>Click the <strong>"📋 Enter Code"</strong> button</li>
								<li><span class="step-number">4</span>Paste the code in the modal</li>
								<li><span class="step-number">5</span>Done! Your account is linked</li>
							</ol>
						</div>
					</div>

					<script>
						function copyCode(element) {
							const code = element.textContent;
							navigator.clipboard.writeText(code).then(() => {
								const btn = element.parentElement.querySelector('button');
								const original = btn.textContent;
								btn.textContent = '✅ Copied!';
								setTimeout(() => {
									btn.textContent = original;
								}, 2000);
							});
						}
					</script>
				</body>
			</html>
		`);
	});

	// Health check endpoint
	app.get("/health", (_req: Request, res: Response) => {
		res.json({ status: "ok" });
	});

	// Last.fm OAuth callback
	app.get("/auth/lastfm/callback", (_req: Request, res: Response) => {
		const token = _req.query.token as string;
		const error = _req.query.error as string;

		if (error) {
			res.send(`
				<!DOCTYPE html>
				<html>
					<head>
						<title>Last.fm Authorization Failed</title>
						<style>
							body { font-family: Arial; background: #d51007; color: white; padding: 50px; text-align: center; }
							.container { background: rgba(0,0,0,0.3); padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
							h1 { color: #ff0000; }
						</style>
					</head>
					<body>
						<div class="container">
							<h1>❌ Authorization Failed</h1>
							<p><strong>Error:</strong> ${error}</p>
							<p>Please try again or contact support.</p>
						</div>
					</body>
				</html>
			`);
			return;
		}

		if (!token) {
			res.send(`
				<!DOCTYPE html>
				<html>
					<head>
						<title>Authorization Failed</title>
						<style>
							body { font-family: Arial; background: #d51007; color: white; padding: 50px; text-align: center; }
							.container { background: rgba(0,0,0,0.3); padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
							h1 { color: #ff0000; }
						</style>
					</head>
					<body>
						<div class="container">
							<h1>❌ No Authorization Token</h1>
							<p>Authorization token not found. Please try again.</p>
						</div>
					</body>
				</html>
			`);
			return;
		}

		// Success - display the token
		res.send(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>Last.fm Authorization Successful</title>
					<style>
						body { 
							font-family: Arial; 
							background: linear-gradient(135deg, #d51007 0%, #a80905 100%);
							color: white; 
							padding: 50px; 
							text-align: center;
							margin: 0;
						}
						.container { 
							background: rgba(0,0,0,0.3); 
							padding: 40px; 
							border-radius: 10px; 
							max-width: 600px; 
							margin: 0 auto;
							backdrop-filter: blur(10px);
						}
						h1 { color: #fff; margin: 0 0 20px 0; }
						p { font-size: 16px; margin: 10px 0; }
						.code-section {
							background: rgba(0,0,0,0.5);
							padding: 20px;
							border-radius: 8px;
							margin: 20px 0;
						}
						.code {
							background: rgba(255,255,255,0.1);
							padding: 15px;
							border-radius: 5px;
							font-family: monospace;
							font-size: 14px;
							word-break: break-all;
							user-select: all;
							cursor: copy;
							color: #ffb81c;
							font-weight: bold;
						}
						.instructions {
							text-align: left;
							background: rgba(0,0,0,0.3);
							padding: 15px;
							border-radius: 5px;
							margin-top: 20px;
							font-size: 14px;
						}
						.instructions ol {
							margin: 10px 0;
							padding-left: 20px;
						}
						.instructions li {
							margin: 8px 0;
						}
						.step-number {
							display: inline-block;
							background: #d51007;
							color: white;
							width: 24px;
							height: 24px;
							border-radius: 50%;
							text-align: center;
							line-height: 24px;
							font-weight: bold;
							margin-right: 8px;
						}
						button {
							background: #d51007;
							color: white;
							border: none;
							padding: 10px 20px;
							border-radius: 5px;
							font-weight: bold;
							cursor: pointer;
							margin-top: 10px;
							font-size: 14px;
						}
						button:hover {
							background: #ffb81c;
							color: black;
						}
					</style>
				</head>
				<body>
					<div class="container">
						<h1>✅ Authorization Successful!</h1>
						<p>Your Last.fm account has been authorized.</p>
						
						<div class="code-section">
							<p><strong>Your Authorization Token:</strong></p>
							<div class="code" onclick="copyCode(this)">${token}</div>
							<button onclick="copyCode(document.querySelector('.code'))">📋 Copy Token</button>
						</div>

						<div class="instructions">
							<strong>Next Steps:</strong>
							<ol>
								<li><span class="step-number">1</span>Copy the token above (click the token or button)</li>
								<li><span class="step-number">2</span>Go back to Discord</li>
								<li><span class="step-number">3</span>Click the <strong>"📋 Enter Token"</strong> button</li>
								<li><span class="step-number">4</span>Paste the token in the modal</li>
								<li><span class="step-number">5</span>Done! Your account is linked</li>
							</ol>
						</div>
					</div>

					<script>
						function copyCode(element) {
							const code = element.textContent;
							navigator.clipboard.writeText(code).then(() => {
								const btn = element.parentElement.querySelector('button');
								const original = btn.textContent;
								btn.textContent = '✅ Copied!';
								setTimeout(() => {
									btn.textContent = original;
								}, 2000);
							});
						}
					</script>
				</body>
			</html>
		`);
	});

	// Catch-all 404
	app.get("*", (_req: Request, res: Response) => {
		res.status(404).send(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>Not Found</title>
					<style>
						body { font-family: Arial; background: #1DB954; color: white; padding: 50px; text-align: center; }
						.container { background: rgba(0,0,0,0.3); padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
						h1 { color: #ff0000; }
					</style>
				</head>
				<body>
					<div class="container">
						<h1>404 - Not Found</h1>
						<p>The page you're looking for doesn't exist.</p>
					</div>
				</body>
			</html>
		`);
	});

	// Determine if using HTTPS
	const useHttps = process.env.USE_HTTPS === "true";
	const certPath = process.env.SSL_CERT_PATH;
	const keyPath = process.env.SSL_KEY_PATH;

	if (useHttps && certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
		// Start HTTPS server
		try {
			const credentials = {
				cert: fs.readFileSync(certPath, "utf8"),
				key: fs.readFileSync(keyPath, "utf8"),
			};
			https.createServer(credentials, app).listen(PORT, () => {
				console.log(`🔒 OAuth Handler running on https://localhost:${PORT}`);
			});
		} catch (error) {
			console.error("Failed to start HTTPS server:", error);
			app.listen(PORT, () => {
				console.log(`🌐 OAuth Handler running on http://localhost:${PORT} (fallback to HTTP)`);
			});
		}
	} else {
		// Start HTTP server
		app.listen(PORT, () => {
			console.log(`🌐 OAuth Handler running on http://localhost:${PORT}`);
		});
	}
}
