const { readNbtFile, generateLitematic } = require('./server/utils/litematicGeneration');
const fs = require('fs');

async function run() {
    try {
        console.log("Reading list of uploads");
        const uploads = fs.readdirSync('./server/uploads');

        for (const upload of uploads) {
            const litematicPath = `./server/uploads/${upload}/source.litematic`;
            if (fs.existsSync(litematicPath)) {
                console.log(`\nTesting ${litematicPath}`);
                const nbt = readNbtFile(litematicPath);

                const configPath = `./server/uploads/${upload}/config.json`;
                let config = [];
                if (fs.existsSync(configPath)) {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8')).config || [];
                }

                if (config.length === 0) {
                    config = JSON.parse(fs.readFileSync('./test.json', 'utf8'));
                }

                console.log("Config:", JSON.stringify(config));
                console.log("Generating litematic, x: 2, z: 2");
                const newNbt = generateLitematic(nbt, config, 2, 2);

                console.log("Writing buffer");
                const buffer = newNbt.write();

                console.log("Success! Generated buffer size:", buffer.length);
            }
        }
    } catch (err) {
        console.error("Error occurred:", err);
    }
}

run();
