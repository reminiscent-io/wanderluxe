// Per-worker setup for eval suites. Workers inherit env from the main process
// (where globalSetup ran), so loading dotenv here is belt-and-braces for runs
// that invoke a suite file directly.
import 'dotenv/config';
