
import fetch from 'node-fetch';
import WebSocket from 'ws';
import { Logger } from 'homebridge';
import { EventEmitter } from 'stream';
import { IloadStateResponse, IloadsResponse, IsetLoadStateResponse, IsetLoadCtrlResponse, IloadState, IloadCtrl, Iload } from './model/wiserComm';
import { Iconfig } from './model/wiserConfig';
import { OutgoingHttpHeaders } from 'http';


export class WiserClient {
  private authKey: string;
  private authToken : string | undefined;
  private log : Logger;
  private websocket : WebSocket;
  private baseUrl: string;
  private headers: OutgoingHttpHeaders;
  public loadStateChange : EventEmitter;

  constructor(config: Iconfig, log: Logger) {

    if (!config.ip){
      throw new Error('expected a configured ip-address for the Wiser device');
    }

    if (!config.authKey){
      throw new Error('expected a configured api-key for communication to the Wiser device');
    }

    this.log = log;
    this.authKey = config.authKey;
    this.log.debug('wiser client fetch function construct');
    this.headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authKey  };

    this.loadStateChange = new EventEmitter();

    const createWebSocket = (ip = config.ip, headers = this.headers) => {
      const result = new WebSocket('ws://' + ip + '/api', [], { headers: headers } );

      result.on('message', (message) => {
        this.log.debug('message received', message.toLocaleString());
        const jsonMessage = JSON.parse(message.toLocaleString());
        const id = jsonMessage.load.id as number;
        const loadstate = jsonMessage.load.state as IloadState;
        // inform the listener(s) for this load
        this.loadStateChange.emit(id.toString(), loadstate);
      });

      result.on('open', () => {
        this.log.debug('websocket opened, sending command "dump_loads"');
        result.send(JSON.stringify({ 'command': 'dump_loads' }));

        const keepalive = setInterval(() => {
          result.ping((error: Error | undefined) => {
            if (error) {
              this.log.error('error on keepalive websocket', error);
              // if readystate = 3 (CLOSED) => reconnect
              if (this.websocket.readyState === 3){
                this.log.error('reconnecting');
                this.websocket = createWebSocket();
              }
              clearInterval(keepalive);
            }
          });
          this.log.debug('ping sent');
        }, 3600000 );
      });

      result.on('close', (code, data) => {
        this.log.info('websocket connetion closed with code', code, 'reason: ', data.toString());
        if (code === 1006){
          this.log.error('cannot connect websocket');
          return;
        }
        this.websocket.terminate();
        this.websocket = createWebSocket();
      });

      result.on('error', (error) => {
        this.log.error('Error on websocket occured with message:', error.message);
        if (error.message === 'getaddrinfo ENOTFOUND'){
          return;
        }
        this.websocket = createWebSocket();
      });

      return result;
    };

    this.websocket = createWebSocket(config.ip, this.headers);
    this.baseUrl = 'http://' + config.ip + '/api';
  }


  // get the wiser loads
  async getLoads(): Promise<Iload[]> {
    this.log.debug('get loads via API', this.baseUrl + '/loads/');
    const response = await fetch (this.baseUrl + '/loads', { headers: this.headers });
    try {
      if (response.ok) {
        const body = await response.json() as IloadsResponse;
        return body.data as Iload[];
      } else {
        this.log.debug(JSON.stringify(response));
        this.log.error('error occured', response.statusText);
        throw new Error('error fetching the loads');
      }
    } catch (error) {
      console.error(error);
    }
    return [];
  }

  // dont use this method for getting a single load - they will be emitted via the websocket (see constructor)
  async getLoadState(id: number) : Promise<IloadState> {
    this.log.debug('fetching loadstate via API', this.baseUrl + '/loads/' + id + '/state');
    const response = await fetch(this.baseUrl + '/loads/' + id + '/state', { headers: this.headers });
    try {
      if (response.ok) {
        const body = await response.json() as IloadStateResponse;
        return body.data.state as IloadState;
      } else {
        this.log.debug(JSON.stringify(response));
        this.log.error('error occured', response.statusText);
        throw new Error('error fetching the load state');
      }
    } catch (error) {
      console.error(error);
    }
    return {};
  }

  // sets the load state of the specified load with the given id
  async setLoadState(id: number, state: IloadState): Promise<IloadState> {
    this.log.debug('setLoadstate for id ' + id);
    const response = await fetch(this.baseUrl + '/loads/' + id + '/target_state', {
      headers: this.headers,
      method: 'put',
      body: JSON.stringify(state),
    });
    try {
      if (response.ok) {
        const body = await response.json() as IsetLoadStateResponse;
        return body.data.target_state as IloadState;
      } else {
        this.log.debug(JSON.stringify(response));
        this.log.error('error occured', response.statusText);
        throw new Error('error fetching the load state');
      }
    } catch (error) {
      console.error(error);
    }
    return {};
  }

  // sets the load control setting of the specified load with the given id
  async ctrlLoad(id: number, loadCtrl : IloadCtrl) : Promise<boolean> {
    this.log.debug('ctrlLoad for id ' + id);
    this.log.debug('ctrlLoad body ' + JSON.stringify(loadCtrl));
    const response = await fetch(this.baseUrl + '/loads/' + id + '/ctrl', {
      headers: this.headers,
      method: 'put',
      body: JSON.stringify(loadCtrl),
    });
    try {
      if (response.ok) {
        const body = await response.json() as IsetLoadCtrlResponse;
        this.log.debug(JSON.stringify(body));
        if (body.status === 'success'){
          return true;
        }
        return false;
      } else {
        this.log.debug(JSON.stringify(response));
        this.log.error('error occured', response.statusText);
        throw new Error('error fetching the load state');
      }
    } catch (error) {
      console.error(error);
    }
    return false;
  }

}
