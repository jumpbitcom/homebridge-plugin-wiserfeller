import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IloadState } from './model/wiserComm';

import { WiserFellerPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class OnOffLoad {
  protected service: Service;
  protected on: boolean;

  constructor(
    protected readonly platform: WiserFellerPlatform,
    protected readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Feller AG')
      .setCharacteristic(this.platform.Characteristic.Model, 'undefined')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.UUID);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.load.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    this.on = false;

    this.platform.myClient?.loadStateChange.on(this.accessory.context.load.id.toString(), (loadState) => this.updateState(loadState));
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.platform.log.debug('Set Characteristic On ->', value);
    let newState: IloadState = {};
    if (value === true) {
      newState = <IloadState> { 'bri': 10000 };
    } else {
      newState = <IloadState> { 'bri': 0 };
    }
    this.platform.log.debug('Set new state to ->', newState);
    const retVal: IloadState = await this.platform.myClient?.setLoadState(this.accessory.context.load.id, newState) ?? {};
    this.platform.log.debug('return of command ->', JSON.stringify(retVal));
    if (retVal.bri === 0) {
      this.on = false;
    } else {
      this.on = true;
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {

    return this.on;

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

  }

  // update this method name to "updateState"
  async updateState(state: IloadState): Promise<void> {
    this.platform.log.debug('update new loadstate on ' + this.accessory.context.load.id + ' with state ' + JSON.stringify(state));
    if (state.bri === 0) {
      this.on = false;
    } else {
      this.on = true;
    }
    this.service.updateCharacteristic(this.platform.Characteristic.On, this.on);
  }
}
