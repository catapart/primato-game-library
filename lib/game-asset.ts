/**
 * Common asset management for games.  
 * Allows loading with progress feedback.
 */
export class GameAsset
{
    source: string;
    bytes: Uint8Array = new Uint8Array(0);
    loadingPromise?: Promise<GameAsset>;
    onProgress?: (receivedBytes: number, totalBytes: number) => void|Promise<void>;

    constructor(source: string)
    {
        this.source = source;
    }

    async load()
    {
        this.loadingPromise = new Promise(async (resolve) =>
        {
            try
            {
                await this.fetchAsset(this.source);
                resolve(this);
            }
            catch(exception)
            {
                console.error(new Error(`There was an error loading an asset from source "${this.source}"`));
                resolve(this);
                return;
            }
        });

        const loadingResult = await this.loadingPromise;
        this.loadingPromise = undefined;
        return loadingResult;
    }

    protected async fetchAsset(source: string)
    {
        const result = await fetch(source);
        if(!result.ok)
        {
            throw new Error(`There was an error loading an asset from source "${source}"`);
        }

        const reader = result.body!.getReader();

        let totalBytesString = result.headers.get('Content-Length');
        if(totalBytesString == null)
        {
            totalBytesString = "-1";
            console.group('🛈 Content-Length Header')
            console.info("The Content-Length header was not set on this response, which means the total number of bytes for the content is unknown. Progress will only report how many bytes are downloaded. Total value will report as -1.");
            console.info("This may be caused by using a chunk-transfer encoding method. For more information, see:")
            console.info("https://en.wikipedia.org/wiki/Chunked_transfer_encoding");
            console.groupEnd();
        }
        const totalBytes = parseInt(totalBytesString);
        let receivedBytes = 0;

        const downloadedChunks = [];
        while(true)
        {
            const { done, value } = await reader.read();
            if(done) { break; }

            downloadedChunks.push(value);
            receivedBytes += value.length;

            if(this.onProgress != null)
            {
                this.onProgress(receivedBytes, totalBytes);
            }

            // await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 100));

            // console.log(`Received ${value.length} bytes.`);
        }

        this.bytes = new Uint8Array(receivedBytes);
        let position = 0;
        for(let chunk of downloadedChunks)
        {
            this.bytes.set(chunk, position);
            position += chunk.length;
        }

        return result;
    }

    getContentTypeMap(headers: Headers)
    {
        const contentTypeHeader = headers.get('Content-Type');
        if(contentTypeHeader != null)
        {
            const contentTypeArray = contentTypeHeader.split(';');
            const contentTypeMap = new Map<string, string>();
            for(let i = 0; i < contentTypeArray.length; i++)
            {
                const equalIndex = contentTypeArray[i].indexOf('=');
                const title = (equalIndex == -1) ? "Unknown" : contentTypeArray[i].substring(0, equalIndex);
                const value = (equalIndex == -1) ? contentTypeArray[i] : contentTypeArray[i].substring(equalIndex + 1);
                contentTypeMap.set(title.trim(), value.trim())
            }

            // console.log(contentTypeMap.entries());

            return contentTypeMap;
        }

        return null;
    }
    
}

export type ImageAssetOptions =
{
}
export const ImageAssetOptions_Default: ImageAssetOptions = 
{
    
};

/**
 * Common image asset management for games.  
 * Allows loading with progress feedback, exposes bitmap data as `bytes` property and creates an image element to display the asset as the `imageElement`.
 */
export class ImageAsset extends GameAsset
{
    #config: ImageAssetOptions;
    imageElement: HTMLImageElement;

    constructor(source: string, config?: ImageAssetOptions)
    {
        super(source);
        this.source = source;
        this.#config = Object.assign(ImageAssetOptions_Default, config);

        this.imageElement = document.createElement('img');
    }

    async load()
    {
        this.loadingPromise = new Promise(async (resolve) =>
        {
            try
            {
                const result = await this.fetchAsset(this.source);

                let imageType = 'utf-8';
                const contentTypeMap = this.getContentTypeMap(result.headers);
                if(contentTypeMap != null)
                {
                    const imageTypeEntry = Array.from(contentTypeMap.values()).find(entry => entry.startsWith('image/'));
                    if(imageTypeEntry != null)
                    {
                        imageType = imageTypeEntry;
                    }

                    // console.log(contentTypeMap.entries());
                }

                this.imageElement.src = URL.createObjectURL(new Blob([this.bytes], { type: imageType }));

                resolve(this);
            }
            catch(exception)
            {
                console.error(new Error(`There was an error loading an image asset from source "${this.source}"`));
                resolve(this);
                return;
            }
        });

        const loadingResult = await this.loadingPromise;
        this.loadingPromise = undefined;
        return loadingResult as ImageAsset;
    }
    
}

export type TextAssetOptions =
{
}
export const TextAssetOptions_Default: TextAssetOptions = 
{
    
};
/**
 * Common text asset management for games.  
 * Allows loading with progress feedback and exposes text value as `content` property.
 */
export class TextAsset extends GameAsset
{
    #config: TextAssetOptions;
    content: string = "";

    constructor(source: string, config?: TextAssetOptions)
    {
        super(source);

        this.source = source;
        this.#config = Object.assign(TextAssetOptions_Default, config);
    }

    async load()
    {
        this.loadingPromise = new Promise(async (resolve) =>
        {
            try
            {
                const result = await this.fetchAsset(this.source);
                let charset = 'utf-8';
                const contentTypeMap = this.getContentTypeMap(result.headers);
                if(contentTypeMap != null)
                {
                    const charsetEntry = contentTypeMap.get('charset');
                    if(charsetEntry != null)
                    {
                        charset = charsetEntry;
                    }
                }

                this.content = new TextDecoder(charset).decode(this.bytes);

                resolve(this);
            }
            catch(exception)
            {
                console.error(new Error(`There was an error loading a text asset from source "${this.source}"`));
                resolve(this);
                return;
            }
        });
        const asset = await this.loadingPromise;
        this.loadingPromise = undefined;
        return asset as TextAsset;
    }    
}