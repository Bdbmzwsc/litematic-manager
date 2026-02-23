const { NbtCompound, NbtFile, NbtString, NbtInt } = require('deepslate');
const fs = require('fs');

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
        sub.position = sub.position.map((str) => Number(str.replace('targetX', x.toString()).replace('targetZ', z.toString())));

        switch (sub.generate_direct) {
            case "+z":
                for (let j = 0; j < z; j++) {
                    const freshNbt = NbtFile.read(originalBuffer);
                    let a = freshNbt.root.getCompound('Regions').getCompound(sub.name);

                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));

                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    sub.position[2] += a.getCompound('Size').getNumber('z');
                    i++;
                }
                break;
            case "+x":
                for (let j = 0; j < x; j++) {
                    const freshNbt = NbtFile.read(originalBuffer);
                    let a = freshNbt.root.getCompound('Regions').getCompound(sub.name);

                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));

                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    sub.position[0] += a.getCompound('Size').getNumber('x');
                    i++;
                }
                break;
            case "-z":
                for (let j = 0; j < z; j++) {
                    const freshNbt = NbtFile.read(originalBuffer);
                    let a = freshNbt.root.getCompound('Regions').getCompound(sub.name);

                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));

                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    sub.position[2] -= a.getCompound('Size').getNumber('z');
                    i++;
                }
                break;
            case "-x":
                for (let j = 0; j < x; j++) {
                    const freshNbt = NbtFile.read(originalBuffer);
                    let a = freshNbt.root.getCompound('Regions').getCompound(sub.name);

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
