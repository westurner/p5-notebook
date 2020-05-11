import { Contents as ServerContents } from '@jupyterlab/services';

import { INotebookContent } from '@jupyterlab/nbformat';

import { StateDB } from '@jupyterlab/statedb';

import { Router } from './router';

import { IJupyterServer } from '../tokens';

import DEFAULT_NB from '../resources/default.ipynb';

import { LocalStorageConnector } from '../storage';

/**
 * A class to handle requests to /api/contents
 */
export class Contents implements IJupyterServer.IRoutable {
  /**
   * Construct a new Contents.
   */
  constructor() {
    const connector = new LocalStorageConnector('contents');
    this._storage = new StateDB<string>({
      connector
    });

    this._router.add(
      'GET',
      '/api/contents/(.*)/checkpoints',
      async (req: Request) => {
        return new Response(JSON.stringify(Private.DEFAULT_CHECKPOINTS));
      }
    );
    this._router.add('GET', Private.FILE_NAME_REGEX, async (req: Request) => {
      const filename = Private.parseFilename(req.url);
      const response = await this._createNotebookResponse(filename);
      if (response) {
        return new Response(JSON.stringify(response));
      }
      return new Response(JSON.stringify(Private.DEFAULT_NOTEBOOK));
    });
    this._router.add('PUT', Private.FILE_NAME_REGEX, async (req: Request) => {
      const filename = Private.parseFilename(req.url);
      const raw = await req.text();
      this._storage.save(filename, raw);
      const response = await this._createNotebookResponse(filename);
      return new Response(JSON.stringify(response), { status: 200 });
    });
  }

  /**
   * Dispatch a request to the local router.
   *
   * @param req The request to dispatch.
   */
  dispatch(req: Request): Promise<Response> {
    return this._router.route(req);
  }

  /**
   * Create the response for retrieving a notebook.
   *
   * @param filename
   * @param req The request to dispatch.
   */
  private async _createNotebookResponse(
    filename: string
  ): Promise<ServerContents.IModel | null> {
    const nb = await this._storage.fetch(filename);
    if (!nb) {
      return null;
    }
    // const modified = new Date();
    return {
      name: filename,
      path: filename,
      // last_modified: modified.toISOString(),
      last_modified: '2020-03-18T18:51:01.243007Z',
      created: '2020-03-18T18:41:01.243007Z',
      content: JSON.parse(nb),
      format: 'json',
      mimetype: '',
      size: nb.length,
      writable: true,
      type: 'notebook'
    };
  }

  private _router = new Router();
  private _storage: StateDB<string>;
}

/**
 * A namespace for Contents statics.
 */
export namespace Contents {
  /**
   * The url for the contents service.
   */
  export const CONTENTS_SERVICE_URL = '/api/contents';
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The regex to match file names.
   */
  export const FILE_NAME_REGEX = new RegExp(/(\w+\.ipynb)/);

  /**
   * Parse the file name from a URL.
   *
   * @param url The request url.
   */
  export const parseFilename = (url: string): string => {
    const matches = new URL(url).pathname.match(FILE_NAME_REGEX);
    return matches?.[0] ?? '';
  };

  /**
   * The default checkpoints.
   */
  export const DEFAULT_CHECKPOINTS = [
    { id: 'checkpoint', last_modified: '2020-03-15T13:51:59.816052Z' }
  ];

  /**
   * The default notebook to serve.
   */
  export const DEFAULT_NOTEBOOK: ServerContents.IModel = {
    name: 'example.ipynb',
    path: 'example.ipynb',
    last_modified: '2020-03-18T18:41:01.243007Z',
    created: '2020-03-18T18:41:01.243007Z',
    content: JSON.parse(DEFAULT_NB),
    format: 'json',
    mimetype: '',
    size: DEFAULT_NB.length,
    writable: true,
    type: 'notebook'
  };

  /**
   * The content for an empty notebook.
   */
  const EMPTY_NB: INotebookContent = {
    metadata: {
      orig_nbformat: 4,
      kernelspec: {
        name: 'p5.js',
        display_name: 'p5.js'
      },
      language_info: {
        codemirror_mode: {
          name: 'javascript',
          version: 3
        },
        file_extension: '.js',
        mimetype: 'text/javascript',
        name: 'javascript',
        nbconvert_exporter: 'javascript',
        pygments_lexer: 'javascript',
        version: 'es2017'
      }
    },
    nbformat_minor: 4,
    nbformat: 4,
    cells: []
  };

  /**
   * The default notebook to serve.
   */
  export const EMPTY_NOTEBOOK: ServerContents.IModel = {
    name: 'untitled.ipynb',
    path: 'untitled.ipynb',
    last_modified: '2020-03-18T18:41:01.243007Z',
    created: '2020-03-18T18:41:01.243007Z',
    content: EMPTY_NB,
    format: 'json',
    mimetype: '',
    size: JSON.stringify(EMPTY_NB).length,
    writable: true,
    type: 'notebook'
  };
}
