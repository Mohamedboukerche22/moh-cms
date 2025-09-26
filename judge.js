const { exec } = require('child_process');
const util = require('util');
const db = require('./db');

const execPromise = util.promisify(exec);

async function evaluateSubmission(code, problemId) {
    return new Promise((resolve, reject) => {
        db.all('SELECT input, output FROM test_cases WHERE problem_id = ?', [problemId], async (err, testCases) => {
            if (err || !testCases.length) {
                return resolve({ status: 'Error', score: 0 });
            }

            let score = 0;
            const maxScorePerTest = 100 / testCases.length; // Equal points per test case
            const fs = require('fs').promises;
            const path = require('path');
            const codeFile = path.join(__dirname, 'temp.cpp');
            const execFile = path.join(__dirname, 'temp');

            try {
                await fs.writeFile(codeFile, code);
                await execPromise(`g++ ${codeFile} -o ${execFile}`);
                
                for (const test of testCases) {
                    try {
                        const { stdout } = await execPromise(`echo "${test.input}" | ${execFile}`, { timeout: 10000 });
                        const normalizedOutput = stdout.trim();
                        const normalizedExpected = test.output.trim();
                        if (normalizedOutput === normalizedExpected) {
                            score += maxScorePerTest;
                        }
                    } catch (error) {
                        // Test case failed or timed out
                        continue;
                    }
                }

                // Clean up
                await fs.unlink(codeFile).catch(() => {});
                await fs.unlink(execFile).catch(() => {});

                resolve({
                    status: score > 0 ? 'Accepted' : 'Rejected',
                    score: Math.round(score)
                });
            } catch (error) {
                resolve({ status: 'Error', score: 0 });
            }
        });
    });
}

module.exports = { evaluateSubmission };
