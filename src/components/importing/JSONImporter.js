import dbService from '../../lib/dbService';
import { nanoid } from 'nanoid';

export async function JSONImporter(zipFile, selectedRootId, masterKey) {
    const JSZip = await import('jszip');
    const zip = await JSZip.default.loadAsync(zipFile);
    let metadataFile = null;
    const pageFiles = [];
    const failedFiles = [];

    // First pass: identify metadata file and page files
    for (const [filename, file] of Object.entries(zip.files)) {
        if (!file.dir) {
            if (filename === 'mintype-data.json') {
                try {
                    const content = await file.async('text');
                    metadataFile = JSON.parse(content);
                } catch (error) {
                    failedFiles.push({
                        filename,
                        error: `JSON parsing error: ${error.message}`,
                        data: null
                    });
                }
            } else if
                (filename.endsWith('.json')) {
                try {
                    const content = await file.async('text');
                    const pageData = JSON.parse(content);
                    pageFiles.push({ filename: filename.replace('.json', '') , data: pageData });
                } catch (error) {
                    failedFiles.push({
                        filename,
                        error: `JSON parsing error: ${error.message}`,
                        data: null
                    });
                }
            }
        }
    }

    let importedCount = 0;

    if (metadataFile && metadataFile.entries) {
        // Structured import with metadata file
        const entriesById = new Map(metadataFile.entries.map(entry => [entry.id, entry]));
        const pageFilesById = new Map(pageFiles.map(page => [page.filename, page.data]));

        // Create metadata entries
        for (const metaEntry of metadataFile.entries) {
            try {
                await dbService.addMetaEntry({
                    id: metaEntry.id,
                    addToQueue: true,
                    newContent: metaEntry
                });
                importedCount++;

                // If this entry has a corresponding page file, create content entry
                if (pageFilesById.has(metaEntry.id)) {
                    const pageContent = pageFilesById.get(metaEntry.id);
                    await dbService.addEntry({
                        addToQueue: true,
                        id: metaEntry.id,
                        preloadedData: pageContent,
                        masterKey: masterKey
                    });

                }
            } catch (error) {
                failedFiles.push({
                    filename: `metadata-entry-${metaEntry.id}`,
                    error: `Failed to save entry: ${error.message}`,
                    data: metaEntry
                });
            }
        }
    } 
    // else {
    //     for (const { filename, data } of pageFiles) {
    //         try {
    //             const pageId = data.id || nanoid();
    //             // if data.type is 'workspace', we skip this file
    //             if (data.type === 'workspace') {
    //                 failedFiles.push({
    //                     filename,
    //                     error: 'Skipping workspace file during unstructured import',
    //                     data
    //                 });
    //                 continue;
    //             }
    //             const pageType = data.type || 'document';


    //             // Create metadata entry
    //             await dbService.addEntry({
    //                 addToQueue: true,
    //                 id: pageId,
    //                 newContent: {
    //                     name: data.name,
    //                     type: pageType || 'document',
    //                     emoji: data.emoji || null,
    //                     created: data.created || Date.now(),
    //                     lastModified: Date.now(),
    //                     lastMetadataModified: Date.now(),
    //                     isFavorite: data.isFavorite || false,
    //                     order: data.order || 1000000,
    //                     deleted: false,
    //                     remoteFileId: null,
    //                     wikiId: null,
    //                 },
    //                 rootId: selectedRootId, //change
    //                 parentId: selectedRootId, //change
    //                 masterKey: masterKey
    //             });

    //             // Create content entry
    //             await dbService.addContentEntry({
    //                 addToQueue: true,
    //                 id: pageId,
    //                 newContent: {
    //                     elements: data.elements || null,
    //                     comments: data.comments || null,
    //                     preferences: data.preferences || null
    //                 },
    //                 masterKey: masterKey
    //             });

    //             importedCount++;
    //         } catch (error) {
    //             failedFiles.push({
    //                 filename,
    //                 error: `Failed to import page: ${error.message}`,
    //                 data
    //             });
    //         }
    //     }
    // }

    return {
        imported: importedCount,
        failedFiles,
        summary: {
            total: pageFiles.length + (metadataFile ? 1 : 0),
            imported: importedCount,
            failed: failedFiles.length,
            hasMetadata: !!metadataFile
        }
    };
}

export async function saveToIndexedDB(page) {
    await dbService.addEntry({
        addToQueue: true,
        preloadedData: page
    });
}

// Helper function to process import results
export function generateImportReport(results) {
    let report = `Import Summary:\n`;
    report += `Total files processed: ${results.summary.total}\n`;
    report += `Successfully imported: ${results.summary.imported}\n`;
    report += `Failed: ${results.summary.failed}\n`;
    report += `Metadata file: ${results.summary.hasMetadata ? 'Found' : 'Not found (unstructured import)'}\n\n`;

    if (results.failedFiles.length > 0) {
        report += `Failed Files:\n`;
        results.failedFiles.forEach(file => {
            report += `- ${file.filename}: ${file.error}\n`;
        });
    }

    return report;
}