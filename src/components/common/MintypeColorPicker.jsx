import { Button, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { ChevronsRight, X } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function MintypeColorPicker({ hideRow1 = false, icon = null, value = { r: 255, g: 255, b: 255, a: 1 }, onChange }) {
    const [color, setColor] = useState(value)
    const [isOpen, setIsOpen] = useState(false)

    function open() {
        setIsOpen(true)
    }

    function close() {
        setIsOpen(false)
    }

    useEffect(() => {
        console.log(value)
        setColor(value)
    }, [])

    // Predefined color palette (8 columns)
    const baseColors = [
        { r: 239, g: 68, b: 68 },   // Red
        { r: 249, g: 115, b: 22 },  // Orange
        { r: 248, g: 228, b: 92 },   // Yellow
        { r: 34, g: 197, b: 94 },   // Green
        { r: 59, g: 130, b: 246 },  // Blue
        { r: 168, g: 85, b: 247 },  // Purple
        { r: 236, g: 72, b: 153 },  // Pink
        { r: 107, g: 114, b: 128 },  // Gray
    ]

    // Generate darker shades (multiply by 0.6)
    const darkerColors = baseColors.map(c => ({
        r: Math.round(c.r * 0.6),
        g: Math.round(c.g * 0.6),
        b: Math.round(c.b * 0.6),
    }))

    // Generate transparent versions (alpha 0.3)
    const transparentColors = baseColors.map(c => ({ ...c, a: 0.3 }))

    const handleColorClick = (newColor) => {
        const colorWithAlpha = { ...newColor, a: newColor.a !== undefined ? newColor.a : 1 }
        setColor(colorWithAlpha)
        onChange?.(colorWithAlpha)
        close()
    }

    const handleInputChange = (key, value) => {
        let newColor = { ...color }

        if (key === 'hex') {
            const rgb = hexToRgb(value)
            if (rgb) {
                newColor = { ...rgb, a: 1 }
            }
        } else if (key === 'a') {
            newColor[key] = parseFloat(value) || 0
        } else {
            newColor[key] = parseInt(value) || 0
        }

        setColor(newColor)
        onChange?.(newColor)
    }

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null
    }

    const rgbToHex = (r, g, b) => {
        return '#' + [r, g, b].map(x => {
            const hex = Math.max(0, Math.min(255, x)).toString(16)
            return hex.length === 1 ? '0' + hex : hex
        }).join('')
    }

    const getColorString = (c) => {
        const alpha = c.a !== undefined ? c.a : 1
        return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`
    }

    return (
        <>
            <Button
                onClick={open}
                className="w-5 h-5 flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ backgroundColor: getColorString(color) }}
            >
                {icon}
            </Button>

            <Dialog open={isOpen} className="relative z-50 focus:outline-none" onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel
                        transition
                        className="dialogPanel !w-fit"
                    >
                        <div className="w-fit">
                            {/* Color Grid */}
                            <div className="space-y-2 mb-4">
                                {/* Row 1: Base colors */}
                                <div className={`grid grid-cols-8 gap-2 ${hideRow1 ? 'hidden' : ''}`}>
                                    {baseColors.map((c, i) => (
                                        <button
                                            key={`base-${i}`}
                                            className="w-6 h-6 rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            style={{ backgroundColor: getColorString({ ...c, a: 1 }) }}
                                            onClick={() => handleColorClick({ ...c, a: 1 })}
                                        />
                                    ))}
                                </div>

                                {/* Row 2: Darker shades */}
                                <div className="grid grid-cols-8 gap-2">
                                    {darkerColors.map((c, i) => (
                                        <button
                                            key={`dark-${i}`}
                                            className="w-6 h-6 rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            style={{ backgroundColor: getColorString({ ...c, a: 1 }) }}
                                            onClick={() => handleColorClick({ ...c, a: 1 })}
                                        />
                                    ))}
                                </div>

                                {/* Row 3: Transparent colors */}
                                <div className="grid grid-cols-8 gap-2">
                                    {transparentColors.map((c, i) => (
                                        <button
                                            key={`trans-${i}`}
                                            className="w-6 h-6 rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            style={{
                                                backgroundColor: getColorString(c),
                                                // dialogal line bg
                                                backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.3))'
                                            }}
                                            onClick={() => handleColorClick(c)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className='flex justify-between mb-2'>
                                {/* one for white and one for black */}
                                <div className='flex gap-4 items-center'>
                                    <button
                                        onClick={() => handleColorClick({ r: 255, g: 255, b: 255, a: 1 })}
                                        className="w-6 h-6 rounded-full hover:scale-110 transition-transform focus:outline-none border border-black focus:ring-2 focus:ring-blue-500"
                                        style={{ backgroundColor: getColorString({ r: 255, g: 255, b: 255, a: 1 }) }}
                                    />

                                    <button
                                        onClick={() => handleColorClick({ r: 0, g: 0, b: 0, a: 1 })}
                                        className="w-6 h-6 rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        style={{ backgroundColor: getColorString({ r: 0, g: 0, b: 0, a: 1 }) }}
                                    />
                                    {/* a button to clear color */}
                                    <button
                                        onClick={() => handleColorClick({ r: 0, g: 0, b: 0, a: 0 })}
                                        className="w-6 h-6 rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 border border-red-400/50"
                                        style={{ backgroundColor: getColorString({ r: 0, g: 0, b: 0, a: 0 }) }}
                                    />
                                </div>
                                {/* show a system color picker */}
                                <input type="color" className='rounded-full w-8' value={getColorString(color)} onChange={(e) => handleColorClick(hexToRgb(e.target.value))} />
                            </div>

                            {/* Input Fields */}
                            <div className="flex gap-2">
                                {/* HEX Input */}
                                <div>
                                    <label className="block textRegular">HEX</label>
                                    <input
                                        type="text"
                                        value={rgbToHex(color.r, color.g, color.b)}
                                        onChange={(e) => handleInputChange('hex', e.target.value)}
                                        className="smallInput w-20"
                                        placeholder="#ffffff"
                                    />
                                </div>

                                {/* RGBA Inputs */}
                                <div className="grid grid-cols-4 gap-2">
                                    <div>
                                        <label className="block textRegular">R</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="255"
                                            value={color.r}
                                            onChange={(e) => handleInputChange('r', e.target.value)}
                                            className="smallInput !text-xs w-12"
                                        />
                                    </div>
                                    <div>
                                        <label className="block textRegular">G</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="255"
                                            value={color.g}
                                            onChange={(e) => handleInputChange('g', e.target.value)}
                                            className="smallInput !text-xs w-12"
                                        />
                                    </div>
                                    <div>
                                        <label className="block textRegular">B</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="255"
                                            value={color.b}
                                            onChange={(e) => handleInputChange('b', e.target.value)}
                                            className="smallInput !text-xs w-12"
                                        />
                                    </div>
                                    <div>
                                        <label className="block textRegular">A</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={color.a}
                                            onChange={(e) => handleInputChange('a', e.target.value)}
                                            className="smallInput !text-xs w-12"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </ >
    )
}