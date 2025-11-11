#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.dirname(__filename);

console.log('\n🎵 NOVARA MUSIC - STARTING...\n');

// Bot startup
const startBot = () => {
	console.log('🤖 Starting Discord Bot...');
	const botProcess = spawn('npm', ['start'], {
		cwd: rootDir,
		stdio: 'inherit',
		shell: true,
	});

	botProcess.on('error', (err) => {
		console.error('❌ Bot Error:', err);
	});

	botProcess.on('exit', (code) => {
		console.log(`❌ Bot exited with code ${code}`);
		if (code !== 0) {
			console.log('⚠️  Restarting bot in 5 seconds...');
			setTimeout(startBot, 5000);
		}
	});

	return botProcess;
};

// Start bot
const botProcess = startBot();

console.log('✅ Bot process started\n');
console.log('════════════════════════════════════════');
console.log('🤖 Bot: Running');
console.log('════════════════════════════════════════\n');
console.log('⚠️  Press Ctrl+C to stop\n');

// Graceful shutdown
const shutdown = () => {
	console.log('\n\n🛑 Shutting down...\n');
	if (!botProcess.killed) {
		botProcess.kill('SIGTERM');
	}
	setTimeout(() => {
		process.exit(0);
	}, 2000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
	console.error('❌ Uncaught Exception:', err);
});

