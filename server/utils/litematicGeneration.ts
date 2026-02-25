import { NbtFile, NbtInt } from 'deepslate';
import { Parser } from 'expr-eval';
import fs from 'fs';
import type { SchematicConfigItem } from '../types/index.js';

const exprParser = new Parser();

export function readNbtFile(filePath: string): NbtFile {
    const buffer = fs.readFileSync(filePath);
    return NbtFile.read(new Uint8Array(buffer));
}

export function generateLitematic(
    nbt: NbtFile,
    config: SchematicConfigItem[],
    x: number,
    z: number
): NbtFile {
    const originalBuffer = nbt.write();

    let i = 0;
    const regionKeys = Array.from(nbt.root.getCompound('Regions').keys());

    config.forEach(sub => {
        const cloneRegion = () => {
            return NbtFile.read(originalBuffer).root.getCompound('Regions').getCompound(sub.name);
        };
        sub.position = (sub.position as (string | number)[]).map((str) =>
            exprParser.evaluate(String(str), { targetX: x, targetZ: z })
        );
        if (!sub.generation) {
            const a = cloneRegion();
            a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
            a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
            a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));
            nbt.root.getCompound('Regions').set(`${i.toString()}`, a);
            i++;
            return;
        }
        const regionForUnitNum = cloneRegion();

        const [unitNumX, unitNumZ] = [
            Math.max(1, Math.floor(((sub.position[0] as number) - (sub.position[0] as number)) / regionForUnitNum.getCompound('Size').getNumber('x'))),
            Math.max(1, Math.floor(((sub.position[2] as number) - (sub.position[2] as number)) / regionForUnitNum.getCompound('Size').getNumber('z')))
        ];

        // Recalculate based on original logic
        const posX = sub.position[0] as number;
        const posZ = sub.position[2] as number;
        const sizeX = regionForUnitNum.getCompound('Size').getNumber('x');
        const sizeZ = regionForUnitNum.getCompound('Size').getNumber('z');

        const actualUnitNumX = Math.max(1, Math.floor((x - posX) / sizeX));
        const actualUnitNumZ = Math.max(1, Math.floor((z - posZ) / sizeZ));

        console.log(actualUnitNumX, actualUnitNumZ);
        switch (sub.generate_direct) {
            case "+z":
                for (let j = 0; j < actualUnitNumZ; j++) {
                    const a = cloneRegion();
                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));
                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    (sub.position[2] as number) += a.getCompound('Size').getNumber('z');
                    i++;
                }
                break;
            case "+x":
                for (let j = 0; j < actualUnitNumX; j++) {
                    const a = cloneRegion();
                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));
                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    (sub.position[0] as number) += a.getCompound('Size').getNumber('x');
                    i++;
                }
                break;
            case "-z":
                for (let j = 0; j < actualUnitNumZ; j++) {
                    const a = cloneRegion();
                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));
                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    (sub.position[2] as number) -= a.getCompound('Size').getNumber('z');
                    i++;
                }
                break;
            case "-x":
                for (let j = 0; j < actualUnitNumX; j++) {
                    const a = cloneRegion();
                    a.getCompound('Position').set('x', new NbtInt(Number(sub.position[0])));
                    a.getCompound('Position').set('y', new NbtInt(Number(sub.position[1])));
                    a.getCompound('Position').set('z', new NbtInt(Number(sub.position[2])));
                    nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
                    (sub.position[0] as number) -= a.getCompound('Size').getNumber('x');
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
