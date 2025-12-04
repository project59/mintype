import { Field, Label, Radio, RadioGroup, Switch, Input, Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { useState, useEffect, useContext } from 'react';
import dbService from '../../lib/dbService.js';
import MintypeColorPicker from '../../components/common/MintypeColorPicker.jsx';
import { ChevronDownIcon, XCircle } from 'lucide-react';
import { SecureContext } from '../secure-context/SecureContext.jsx';

const gridTypes = {
    none: 'None',
    dots: 'Dots',
    lines: 'Lines',
};

export default function PagePreferences({ pageId, updatePreferences }) {
    const [preferences, setPreferences] = useState(null);
    const {masterKey} = useContext(SecureContext);
    const [type, setType] = useState(null);
    // Fetch preferences from the database
    useEffect(() => {
        const fetchPreferences = async () => {
            const page = await dbService.getContent(pageId, masterKey);
            if (page && page.preferences) {
                setPreferences(page.preferences);
            }
        };
        const fetchMeta = async () => {
            const page = await dbService.getMeta(pageId);
            if (page) {
                setType(page.type);
            }
        };
        fetchPreferences();
        fetchMeta();
    }, [pageId]);

    const handleChange = (key, value) => {
        if (preferences) {
            const updatedPreferences = { ...preferences, [key]: value };
            updatePreferences(updatedPreferences);
            setPreferences(updatedPreferences);
        }
    };

    const exportToJSON = async () => {
        await dbService.getContent(pageId, masterKey).then((page) => {
            const json = JSON.stringify(page, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${pageId}.json`;
            link.click();
            URL.revokeObjectURL(url);
        })
    };

    if (!preferences) return <div>Loading...</div>;

    return (
        <div className="w-full space-y-4">
            {type === 'whiteboard' && (
                <Field className="flex justify-between items-center">
                    <div className='flex flex-col'>
                        <Label className={'textLabel'}>Lock Scroll Y</Label>
                        <span className='text-xs text-gray-400'>Prevent scrolling vertically</span>
                    </div>
                    <Switch
                        checked={preferences.lockScrollY}
                        onChange={(enabled) => handleChange('lockScrollY', enabled)}
                        className="switchGroup group"
                    >
                        <span
                            aria-hidden="true"
                            className="switchSpan"
                        />
                    </Switch>
                </Field>
            )}

            {type === 'whiteboard' && (
                <Field className="flex justify-between items-center">
                    <div className='flex flex-col'>
                        <Label className={'textLabel'}>Lock Scroll X</Label>
                        <span className='text-xs text-gray-400'>Prevent scrolling horizontally</span>
                    </div>
                    <Switch
                        checked={preferences.lockScrollX}
                        onChange={(enabled) => handleChange('lockScrollX', enabled)}
                        className="switchGroup group"
                    >
                        <span
                            aria-hidden="true"
                            className="switchSpan"
                        />
                    </Switch>
                </Field>
            )}

            {type === 'whiteboard' && (
                <div className='space-y-2'>
                    <div className='flex flex-col'>
                        <div className={'textLabel'}>Grid Styles</div>
                        <span className='text-xs text-gray-400'>
                            Select a grid style to apply to the page
                        </span>
                    </div>

                    <RadioGroup
                        value={preferences.gridType}
                        onChange={(gridType) => handleChange('gridType', gridType)}
                        className="flex gap-1"
                    >
                        {Object.entries(gridTypes).map(([key, label]) => (
                            <Radio
                                key={key}
                                value={key}
                                className={({ checked }) =>
                                    `flex items-center justify-center py-1 cursor-pointer px-1 rounded-full w-full transition
                                ${checked
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-indigo-500/30 text-white'
                                    }`
                                }
                            >
                                <div>
                                    <p className="text-sm font-medium">{label}</p>
                                </div>
                            </Radio>
                        ))}
                    </RadioGroup>
                    {/* Grid Size */}
                    <Field className={'flex justify-between items-center'}>
                        <Label className={'text-xs'}>Grid Size</Label>
                        <Input
                            type="number"
                            value={preferences.gridSize}
                            onChange={(e) => handleChange('gridSize', Number(e.target.value))}
                            className="w-12 rounded-full bg-indigo-400/20 p-1 px-2 text-indigo-400 font-medium text-xs"
                        />
                    </Field>
                </div>
            )}

            {type === 'whiteboard' && (
                <Field className={'flex justify-between'}>
                    <div className='flex flex-col'>
                        <Label className={'textLabel'}>Background</Label>
                        <span className='text-xs text-gray-400'>Set the whiteboard color</span>
                    </div>
                    <div className='flex gap-2 items-center'>
                        <MintypeColorPicker
                            value={preferences.bgColor}
                            onChange={(color) => handleChange('bgColor', color)}
                        />
                        <button className='btnChip' onClick={() => handleChange('bgColor', { r: 255, g: 255, b: 255, a: 0 })}>
                            <XCircle size={14} />
                        </button>
                    </div>
                </Field>
            )}

            {/* Grid Color */}
            {/* <Field>
                    <Label>Grid Color</Label>
                    <SketchPicker
                        color={preferences.gridColor}
                        onChangeComplete={(color) => handleChange('gridColor', color.rgb)}
                    />
                </Field> */}

            <Disclosure as="div" className="" defaultOpen={false}>
                <DisclosureButton className="group flex w-full items-center justify-between">
                    <span className="textLabel">
                        Page Export Options
                    </span>
                    <ChevronDownIcon className="size-5 group-data-[open]:rotate-180 duration-200" />
                </DisclosureButton>
                <DisclosurePanel className="mt-2">
                    <div className='flex justify-between items-center'>
                        <p className='text-xs'>
                            Export this page as JSON
                        </p>
                        <button className='btnAction' onClick={exportToJSON}>
                            Export
                        </button>
                    </div>
                </DisclosurePanel>
            </Disclosure>


        </div>
    );
}
