/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  AccessoryPlugin,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
  CharacteristicEventTypes,
} from "homebridge";

export class Contact implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly bleMac: string;
  private readonly scanDuration: number;
  private readonly scanInterval: number;

  private contact: number = 0;

  // This property must be existent!!
  name: string;

  private readonly contactSercice: Service;
  private readonly informationService: Service;

  constructor(hap: HAP, log: Logging, name: string, bleMac: string, scanDuration: number, scanInterval: number) {
    this.log = log;
    this.name = name;
    this.bleMac = bleMac;
    this.scanDuration = scanDuration;
    this.scanInterval = scanInterval;

    this.contactSercice = new hap.Service.ContactSensor(name);
    this.contactSercice
      .getCharacteristic(hap.Characteristic.ContactSensorState)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info(name + " Current Contact Sensor State: " + this.contact + "\u2103");
        callback(undefined, this.contact < 0 ? 0 : this.contact > 100 ? 100 : this.contact);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        log.info("The Contact Sensor State of the Contact can't be set!");
        callback();
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "SwitchBot")
      .setCharacteristic(hap.Characteristic.Model, "SWITCHBOT-CONTACT-S1")
      .setCharacteristic(hap.Characteristic.SerialNumber, this.bleMac);

    log.info(name, "scanDuration:" + this.scanDuration.toString() + "ms", "scanInterval:" + this.scanInterval.toString() + "ms");

    const Switchbot = require("node-switchbot");
    const switchbot = new Switchbot();

    switchbot.onadvertisement = (ad: any) => {
      log.debug(JSON.stringify(ad, null, '  '));
      log.debug("Service Data:", ad.serviceData);
      //log.debug("Temperature:", ad.serviceData.temperature.c);
      //log.debug("Humidity:", ad.serviceData.humidity);
      this.contact = ad.serviceData;
    };

    switchbot
      .startScan({
        id: bleMac,
      })
      .then(() => {
        return switchbot.wait(this.scanDuration);
      })
      .then(() => {
        switchbot.stopScan();
      })
      .catch((error: any) => {
        log.error(error);
      });

    setInterval(() => {
      // log.info("Start scan " + name + "(" + bleMac + ")");
      switchbot
        .startScan({
          // mode: 'T',
          id: bleMac,
        })
        .then(() => {
          return switchbot.wait(this.scanDuration);
        })
        .then(() => {
          switchbot.stopScan();
          // log.info("Stop scan " + name + "(" + bleMac + ")");
        })
        .catch((error: any) => {
          log.error(error);
        });
    }, this.scanInterval);
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log.info("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [this.informationService, this.contactSercice];
  }
}
