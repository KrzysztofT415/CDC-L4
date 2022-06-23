const fs = require('fs')
const { readFile } = require('fs/promises')
const myPrompt = require('prompt')
const TGA = require('tga')
const chalk = require('chalk')

import CONFIG from './config'
import { getEntropy } from './utils'
import * as TgaParser from './tgaParser'

//
;(async () => {
    myPrompt.start()
    let fast = false
    readingInput: while (true) {
        // INPUT
        if (fast) return
        let { inputName } = await myPrompt.get(CONFIG.IN_FILE_NAME_PROPERTIES)
        if (inputName === 'q' || inputName === '') return
        if (inputName.split(' ').length > 1) {
            ;[inputName] = inputName.split(' ')
            fast = true
        }

        let data: any
        try {
            data = await readFile(inputName)
            console.log('FILE: ', data)
        } catch (exc) {
            console.log(exc, '\nFile not found')
            continue readingInput
        }

        // CALCULATIONS
        const tga_img = new TGA(data)
        let tga_data = TgaParser.emptyTgaData(tga_img.width * 3, tga_img.height)
        for (let i = 0, j = 0; i < tga_img.pixels.length; j++, i += 4) {
            let r = Math.floor(j / tga_img.width)
            let c = j % tga_img.width

            tga_data.whole[c][r * 3] = tga_img.pixels[i]
            tga_data.whole[c][r * 3 + 1] = tga_img.pixels[i + 1]
            tga_data.whole[c][r * 3 + 2] = tga_img.pixels[i + 2]
            tga_data.r.push(tga_img.pixels[i])
            tga_data.g.push(tga_img.pixels[i + 1])
            tga_data.b.push(tga_img.pixels[i + 2])
        }

        let tga_whole = tga_data.whole.reduce((all, row) => all.concat(row), [])
        console.log('BITMAP: ', Buffer.from(new Uint8Array(tga_whole).buffer))
        console.log('> Entropy: ', getEntropy(tga_whole))
        console.log('> Entropy[r]: ', getEntropy(tga_data.r))
        console.log('> Entropy[g]: ', getEntropy(tga_data.g))
        console.log('> Entropy[b]: ', getEntropy(tga_data.b))

        console.log(chalk.red('-'.repeat(40)))
        console.time('Encoding time')
        let result_data = TgaParser.encode(tga_data)
        console.timeEnd('Encoding time')

        let [min, r, g, b] = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
        let [min_pred, r_pred, g_pred, b_pred] = ['', '', '', '']
        for (const predictor in result_data) {
            console.log(chalk.red('-'.repeat(40)))
            console.log('* Predictor - ' + chalk.underline.magenta.bold(predictor))
            console.log('BITMAP: ', result_data[predictor].buffer)
            console.log('> Entropy: ', result_data[predictor].whole_entropy)
            console.log('> Entropy[r]: ', result_data[predictor].r_entropy)
            console.log('> Entropy[g]: ', result_data[predictor].g_entropy)
            console.log('> Entropy[b]: ', result_data[predictor].b_entropy)
            if (result_data[predictor].whole_entropy < min) [min, min_pred] = [result_data[predictor].whole_entropy, predictor]
            if (result_data[predictor].r_entropy < r) [r, r_pred] = [result_data[predictor].r_entropy, predictor]
            if (result_data[predictor].g_entropy < g) [g, g_pred] = [result_data[predictor].g_entropy, predictor]
            if (result_data[predictor].b_entropy < b) [b, b_pred] = [result_data[predictor].b_entropy, predictor]
        }

        console.log(chalk.red('-'.repeat(40)))
        console.log('MINIMAL: [' + chalk.cyan(inputName) + ']')
        console.log('> all: ', min_pred, ' ~ ', min)
        console.log('>   r: ', r_pred, ' ~ ', r)
        console.log('>   g: ', g_pred, ' ~ ', g)
        console.log('>   b: ', b_pred, ' ~ ', b)
    }
})()
