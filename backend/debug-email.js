const { sendEmail } = require('./email-service');

async function test() {
    console.log('Testing email service...');
    try {
        const result = await sendEmail('accreditationsystem@htu.edu.gh', 'Test', 'Testing...');
        console.log('RESULT_START');
        console.log(JSON.stringify(result, null, 2));
        console.log('RESULT_END');
        process.exit(result.success ? 0 : 1);
    } catch (e) {
        console.error('EXCEPTION:', e);
        process.exit(1);
    }
}

test();
