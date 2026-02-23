const { NbtCompound, NbtFile, NbtString, NbtInt } = require('deepslate');
const { Parser } = require('expr-eval');
const fs = require('fs');

const exprParser = new Parser();

function readNbtFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    return NbtFile.read(new Uint8Array(buffer));
}

function generateLitematic(nbt, config, x, z) {
    // Generate a buffer from the original nbt so we can deep-clone from it safely
    const originalBuffer = nbt.write();

    let i = 0;
    const regionKeys = Array.from(nbt.root.getCompound('Regions').keys());

    config.forEach(sub => {
        const cloneRegion = () => {
            return NbtFile.read(originalBuffer).root.getCompound('Regions').getCompound(sub.name);
        }
        sub.position = sub.position.map((str) => exprParser.evaluate(str, { targetX: x, targetZ: z }));
        if (!sub.generation) {
            let a = cloneRegion();
            a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
            a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
            a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));
            nbt.root.getCompound('Regions').set(`${i.toString()}`, a);
            i++;
            return;
        }
        const regionForUnitNum = cloneRegion();

        const [unitNumX, unitNumZ] = [

            Math.max(1, Math.floor((x - sub.position[0]) / regionForUnitNum.getCompound('Size').getNumber('x'))),

            Math.max(1, Math.floor((z - sub.position[2]) / regionForUnitNum.getCompound('Size').getNumber('z')))
        ];

        console.log(unitNumX, unitNumZ);
        switch (sub.generate_direct) {
            case "+z":
                for (let j = 0; j < unitNumZ; j++) {
                    let a = cloneRegion();

                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));

                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    sub.position[2] += a.getCompound('Size').getNumber('z');
                    i++;
                }
                break;
            case "+x":
                for (let j = 0; j < unitNumX; j++) {
                    let a = cloneRegion();

                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));

                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    sub.position[0] += a.getCompound('Size').getNumber('x');
                    i++;
                }
                break;
            case "-z":
                for (let j = 0; j < unitNumZ; j++) {
                    let a = cloneRegion();

                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));

                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    sub.position[2] -= a.getCompound('Size').getNumber('z');
                    i++;
                }
                break;
            case "-x":
                for (let j = 0; j < unitNumX; j++) {
                    let a = cloneRegion();

                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));

                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    sub.position[0] -= a.getCompound('Size').getNumber('x');
                    i++;
                }
                break;
        }
    });

    // Clean up original region bases
    regionKeys.forEach(key => {
        nbt.root.getCompound('Regions').delete(key);
    });

    return nbt;
}

module.exports = {
    readNbtFile,
    generateLitematic
};
