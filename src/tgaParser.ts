import { log } from 'console'
import { getEntropy } from './utils'

export interface TgaData {
    readonly whole: number[][]
    width: number
    height: number
    readonly r: number[]
    readonly g: number[]
    readonly b: number[]
}
export const emptyTgaData = (width: number, height: number): TgaData => {
    return {
        whole: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
        width,
        height,
        r: [],
        g: [],
        b: []
    }
}
export interface TgaPredictorResults {
    readonly predictor: Function
    buffer?: Buffer
    whole_entropy?: number
    r_entropy?: number
    g_entropy?: number
    b_entropy?: number
}
export interface TgaResults {
    [index: string]: TgaPredictorResults
}

const Xb_W = (x: number, n: number, w: number, nw: number) => x - w
const Xb_N = (x: number, n: number, w: number, nw: number) => x - n
const Xb_NW = (x: number, n: number, w: number, nw: number) => x - nw
const Xb_N_W_NW = (x: number, n: number, w: number, nw: number) => x - (n + w - nw)
const Xb_N_W_NW2 = (x: number, n: number, w: number, nw: number) => x - (n + ((w - nw) >>> 1))
const Xb_W_N_NW2 = (x: number, n: number, w: number, nw: number) => x - (w + ((n - nw) >>> 1))
const Xb_N_W_2 = (x: number, n: number, w: number, nw: number) => x - ((n + w) >>> 1)
const Xb_NEW = (x: number, n: number, w: number, nw: number) => {
    let max = Math.max(w, n)
    if (nw >= max) return x - max
    let min = Math.min(w, n)
    if (nw <= min) return x - min
    return Xb_N_W_NW(x, n, w, nw)
}

const predictors_core = (predictor: Function, data: TgaData): TgaData => {
    let result_data = emptyTgaData(data.width, data.height)
    for (let j = 0; j < data.height; j++) {
        for (let i = 0; i < data.width; i++) {
            let x = data.whole[j][i]
            let n = j - 1 >= 0 ? data.whole[j - 1][i] : 0
            let w = data.whole[j][i - 3] ?? 0
            let nw = j - 1 >= 0 ? data.whole[j - 1][i - 3] ?? 0 : 0
            let res = ((predictor(x, n, w, nw) % 256) + 256) % 256

            result_data.whole[j][i] = res

            switch (j % 3) {
                case 0:
                    result_data.r.push(res)
                    break
                case 1:
                    result_data.g.push(res)
                    break
                case 2:
                    result_data.b.push(res)
                    break
            }
        }
    }

    console.log(predictor.name)
    for (let j = 0; j < 7; j++) {
        let a = ''
        for (let i = 0; i < 21; i++) {
            a += result_data.whole[j][i] + '\t'
            if (i % 3 == 2) a += '|  '
        }
        console.log(a)
    }
    console.log('.'.repeat(20))

    return result_data
}

export const encode = (data: TgaData): TgaResults => {
    let result_data: TgaResults = {
        'Xb = W': { predictor: Xb_W },
        'Xb = N': { predictor: Xb_N },
        'Xb = NW': { predictor: Xb_NW },
        'Xb = N + W - NW': { predictor: Xb_N_W_NW },
        'Xb = N + (W - NW)/2': { predictor: Xb_N_W_NW2 },
        'Xb = W + (N - NW)/2': { predictor: Xb_W_N_NW2 },
        'Xb = (N + W)/2': { predictor: Xb_N_W_2 },
        'Xb = new one': { predictor: Xb_NEW }
    }

    for (const predictor in result_data) {
        let results = predictors_core(result_data[predictor].predictor, data)

        let results_whole = results.whole.reduce((all, row) => all.concat(row), [])
        result_data[predictor].buffer = Buffer.from(new Uint8Array(results_whole).buffer)
        result_data[predictor].whole_entropy = getEntropy(results_whole)

        result_data[predictor].r_entropy = getEntropy(results.r)
        result_data[predictor].g_entropy = getEntropy(results.g)
        result_data[predictor].b_entropy = getEntropy(results.b)
    }

    return result_data
}
