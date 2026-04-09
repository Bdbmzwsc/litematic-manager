import { NbtFile, NbtInt } from 'deepslate';
import { Parser } from 'expr-eval';
import fs from 'fs';
import type { SchematicConfigItem } from '../types/index.js';
import e from 'express';

const exprParser = new Parser();

export function readNbtFile(filePath: string): NbtFile {
    const buffer = fs.readFileSync(filePath);
    return NbtFile.read(new Uint8Array(buffer));
}

// 让这个函数返回俩个值
export function generateLitematic(
    nbt: NbtFile,
    config: SchematicConfigItem[],
    x: number,
    z: number
): [NbtFile | null, boolean] {
    const originalBuffer = nbt.write();

    let i = 0;
    const regionKeys = Array.from(nbt.root.getCompound('Regions').keys());

    for (const sub of config) {
        const cloneRegion = () => {
            return NbtFile.read(originalBuffer).root.getCompound('Regions').getCompound(sub.name);
        };

        const position = sub.position.map((str) =>
            exprParser.evaluate(String(str), { targetX: x, targetZ: z })
        );
        let end_position: number[] | null = null;
        if (sub.end_position) {
            end_position = sub.end_position.map((str) =>
                exprParser.evaluate(String(str), { targetX: x, targetZ: z })
            );
        }

        const shouldGenerate = sub.generation ?? true;
        if (!shouldGenerate) {
            const a = cloneRegion();
            a.getCompound('Position').set('x', new NbtInt(Number(position[0])));
            a.getCompound('Position').set('y', new NbtInt(Number(position[1])));
            a.getCompound('Position').set('z', new NbtInt(Number(position[2])));
            nbt.root.getCompound('Regions').set(`${i.toString()}`, a);
            i++;
            continue;
        }
        const regionForUnitNum = cloneRegion();


        // Recalculate based on original logic
        const posX = position[0] as number;
        const posZ = position[2] as number;
        const sizeX = regionForUnitNum.getCompound('Size').getNumber('x');
        const sizeZ = regionForUnitNum.getCompound('Size').getNumber('z');


        const actualUnitNumX = Math.max(1, Math.floor(((x - posX) + 1) / sizeX))
        const actualUnitNumZ = Math.max(1, Math.floor(((z - posZ) + 1) / sizeZ));

        const UnitCountNameMapping = {
            'x': actualUnitNumX,
            'z': actualUnitNumZ
        }
        const positionIndexMapping = {
            'x': 0,
            'y': 1,
            'z': 2
        };

        if (!sub.generate_direct)
            return [null, false];

        const axisDirection = sub.generate_direct[1] as 'x' | 'z';

        for (let j = 0; j < UnitCountNameMapping[axisDirection]; j++) {
            const isPositive: boolean = sub.generate_direct[0] === '+' ? true : false;
            if (isPositive) {
                if (end_position && position[positionIndexMapping[axisDirection]] > end_position[positionIndexMapping[axisDirection]])
                    break;
            }
            else {
                if (end_position && position[positionIndexMapping[axisDirection]] < end_position[positionIndexMapping[axisDirection]])
                    break;
            }

            const a = cloneRegion();
            a.getCompound('Position').set('x', new NbtInt(Number(position[0])));
            a.getCompound('Position').set('y', new NbtInt(Number(position[1])));
            a.getCompound('Position').set('z', new NbtInt(Number(position[2])));
            nbt.root.getCompound('Regions').set(`${i.toString()}_${j.toString()}`, a);
            if (isPositive)
                position[positionIndexMapping[axisDirection]] += a.getCompound('Size').getNumber(axisDirection);
            else
                position[positionIndexMapping[axisDirection]] -= a.getCompound('Size').getNumber(axisDirection);
            i++;
        }
    }

    // Clean up original region bases
    regionKeys.forEach(key => {
        nbt.root.getCompound('Regions').delete(key);
    });

    return [nbt, true];
}
