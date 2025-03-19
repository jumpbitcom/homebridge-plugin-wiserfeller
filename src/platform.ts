import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { Dimmer } from './dimmer';
import { Motor } from './motor';
import { OnOffLoad } from './onoffload';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

import { WiserClient } from './client';
import { Iconfig } from './model/wiserConfig';
import { Iload } from './model/wiserComm';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class WiserFellerPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  public readonly myClient?: WiserClient;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('wiser plugin initializing platform');

    try {
      const myConfig: Iconfig = {
        ip: this.config.ip,
        authKey: this.config.authKey,
      };
      this.log.debug('wiser plugin config set with device ip: ' + myConfig.ip);
      this.myClient = new WiserClient(myConfig, this.log);
    } catch (error) {
      this.log.error('error occured during wiser by feller client initialization: ', error);
    }



    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {
    this.log.debug('discover devices called');

    const loads: Iload[] = await this.myClient?.getLoads() ?? [];

    for (const load of loads) {

      if (load.type !== 'onoff' && load.type !== 'dim' && load.type !== 'motor' && load.type !== 'dali') {
        continue;
      }
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(load.device + '-' + load.channel);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.get(uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache: ' + existingAccessory.displayName + ' ' + load.name + ' ' + load.id + ' as type: ' + load.type);
        switch (load.type) {
        case 'onoff':
          new OnOffLoad(this, existingAccessory);
          break;
        case 'dim':
          new Dimmer(this, existingAccessory);
          break;
        case 'motor':
          new Motor(this, existingAccessory);
          break;
        case 'dali':
          new Dimmer(this, existingAccessory);
        }
      } else {
        this.log.info('Adding new accessory:', load.device);
        const accessory = new this.api.platformAccessory(load.device, uuid);
        accessory.context.load = load;
        switch (load.type) {
        case 'onoff':
          new OnOffLoad(this, accessory);
          break;
        case 'dim':
          new Dimmer(this, accessory);
          break;
        case 'motor':
          new Motor(this, accessory);
          break;
        case 'dali':
          new Dimmer(this, accessory);
          break;
        }
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }

      // push into discoveredCacheUUIDs
      this.discoveredCacheUUIDs.push(uuid);
    }

    // you can also deal with accessories from the cache which are no longer present by removing them from Homebridge
    // for example, if your plugin logs into a cloud account to retrieve a device list, and a user has previously removed a device
    // from this cloud account, then this device will no longer be present in the device list but will still be in the Homebridge cache
    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.log.info('Removing existing accessory from cache:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
