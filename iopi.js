﻿//
//    ================================================
// ABElectronics IO Pi 32- Channel Port Expander
// For use with the IO Pi, IO Pi Plus and IO Pi Zero
// Version 1.0 Created 06/ 07 / 2016
// Requires rpio to be installed, install with: npm install rpio
// ================================================
// Each MCP23017 chip is split into two 8-bit ports.  port 0 controls
// pins 1 to 8 while port 1 controls pins 9 to 16.
// When writing to or reading from a port the least significant bit represents
// the lowest numbered pin on the selected port.
//
var rpio = require('rpio');

IoPi = (function () {
    // Define registers values from datasheet
    const IODIRA = 0x00;  // IO direction A - 1= input 0 = output
    const IODIRB = 0x01;  // IO direction B - 1= input 0 = output
    // Input polarity A - If a bit is set, the corresponding GPIO register bit will reflect the inverted value on the pin.
    const IPOLA = 0x02;
    // Input polarity B - If a bit is set, the corresponding GPIO register bit will reflect the inverted value on the pin.
    const IPOLB = 0x03;
    // The GPINTEN register controls the interrupt-onchange feature for each pin on port A.
    const GPINTENA = 0x04;
    // The GPINTEN register controls the interrupt-onchange feature for each pin on port B.
    const GPINTENB = 0x05;
    // Default value for port A - These bits set the compare value for pins configured for interrupt-on-change.
    // If the associated pin level is the opposite from the register bit, an interrupt occurs.
    const DEFVALA = 0x06;
    // Default value for port B - These bits set the compare value for pins configured for interrupt-on-change. If the associated pin level is the
    // opposite from the register bit, an interrupt occurs.
    const DEFVALB = 0x07;
    // Interrupt control register for port A.  If 1 interrupt is fired when the pin matches the default value, if 0 the interrupt is fired on state change
    const INTCONA = 0x08;
    // Interrupt control register for port B.  If 1 interrupt is fired when the pin matches the default value, if 0 the interrupt is fired on state change
    const INTCONB = 0x09;
    const IOCON = 0x0A;  // see datasheet for configuration register
    const GPPUA = 0x0C;  // pull-up resistors for port A
    const GPPUB = 0x0D; // pull-up resistors for port B
    // The INTF register reflects the interrupt condition on the port A pins of any pin that is enabled for interrupts. A set bit indicates that the
    // associated pin caused the interrupt.
    const INTFA = 0x0E;
    // The INTF register reflects the interrupt condition on the port B pins of any pin that is enabled for interrupts. A set bit indicates that the
    // associated pin caused the interrupt.
    const INTFB = 0x0F;
    // The INTCAP register captures the GPIO port A value at the time the interrupt occurred.
    const INTCAPA = 0x10;
    // The INTCAP register captures the GPIO port B value at the time the interrupt occurred.
    const INTCAPB = 0x11;
    const GPIOA = 0x12;  // Data port A
    const GPIOB = 0x13;  // Data port B
    const OLATA = 0x14;  // Output latches A
    const OLATB = 0x15; // Output latches B

    // variables
    IoPi.prototype.portADir = 0x00;  // port a direction
    IoPi.prototype.portBDir = 0x00;  // port b direction
    IoPi.prototype.portAVal = 0x00;  // port a value
    IoPi.prototype.portBVal = 0x00;  // port b value
    IoPi.prototype.portAPullup = 0x00;  // port a pull-up resistors
    IoPi.prototype.portBPullup = 0x00;  // port a pull-up resistors
    IoPi.prototype.portAPolarity = 0x00; // input polarity for port a
    IoPi.prototype.portBPolarity = 0x00;  // input polarity for port b
    IoPi.prototype.intA = 0x00; // interrupt control for port a
    IoPi.prototype.intB = 0x00;  // interrupt control for port a
    // initial configuration - see IOCON page in the MCP23017 datasheet for more information.
    IoPi.prototype.config = 0x22;

    IoPi.prototype.i2caddress = 0x00;

    function IoPi(address) {
        /// <summary>
        /// Initialize the I2C bus based on the supplied address
        /// Load the default configuration, all pins are inputs with pull- ups disabled
        /// </summary>
        /// <param name="address">I2C address. Default is 0x20 or 0x21</param>
        this.i2caddress = address;
        rpio.i2cBegin();
        rpio.i2cSetSlaveAddress(this.i2caddress);
        this.i2cWriteByte(IOCON, this.config);
        this.portAVal = this.i2cReadByte(GPIOA);
        this.portBVal = this.i2cReadByte(GPIOB);
        this.i2cWriteByte(IODIRA, 0xFF);
        this.i2cWriteByte(IODIRB, 0xFF);
        this.setPortPullups(0, 0x00);
        this.setPortPullups(1, 0x00);
        this.invertPort(0, 0x00);
        this.invertPort(1, 0x00);
    }
    // local methods

    // <summary>
    // Internal function for updating the configuration to the selected channel
    // </summary>
    // <param name="channel">ADC channel, 1 - 8</param>
/*
    var i2cReadByteTest = function(val,next) {
        var txbuf = new Buffer([val]);
        var rxbuf = new Buffer(1);
				
        rpio.i2cSetSlaveAddress(this.i2caddress);
        rpio.i2cWrite(txbuf);
 
       var err = rpio.i2cRead(rxbuf, 1);
				
				if(err)	 next(err);
				else  	next(null, rxbuf[0]);
    }
*/

    IoPi.prototype.i2cReadByte = function(val) {

				var txbuf = new Buffer([val]);
        var rxbuf = new Buffer(1);

        rpio.i2cSetSlaveAddress(this.i2caddress);
        rpio.i2cWrite(txbuf);

        var err = rpio.i2cRead(rxbuf, 1);

				if( err ) return 500 + err;
				else 			return rxbuf[0];
    }
/*
    IoPi.prototype.i2cReadByteTest1 = function(val,next) {
        var txbuf = new Buffer([val]);
        var rxbuf = new Buffer(1);
				
        rpio.i2cSetSlaveAddress(this.i2caddress);
        rpio.i2cWrite(txbuf);
 
       var err = rpio.i2cRead(rxbuf, 1);
				
				if(err)	 next(err);
				else  	next(null, rxbuf[0]);
    }
*/
    IoPi.prototype.i2cWriteByte = function (register, val) {
        rpio.i2cSetSlaveAddress(this.i2caddress);
        var txbuf = new Buffer([register, val]);
        var rxbuf = new Buffer(1);
        rpio.i2cWrite(txbuf);
    }

    updateByte = function(oldByte, bit, value) {
        // internal function for setting the value of a single bit within a byte
        var newByte = 0;
        if (value == false) {
            newByte = oldByte & ~(1 << bit);
        } else {

            newByte = oldByte | 1 << bit;
        }
        return (newByte);
    }

    // <summary>
    // Internal function for updating the configuration to the selected channel
    // </summary>
    // <param name="channel">ADC channel, 1 - 8</param>
    function checkBit(num, bit) {
        return ((num >> bit) % 2 != 0)
    }

    // public methods

    IoPi.prototype.setPinDirection = function (pin, direction) {
        //
        // set IO direction for an individual pin
        // pins 1 to 16
        // direction 1 = input, 0 = output
        //
        pin = pin - 1;
        if (pin < 8) {
            this.portADir = updateByte(this.portADir, pin, direction);
            this.i2cWriteByte(IODIRA, this.portADir);
        } else {
            this.portBDir = updateByte(this.portBDir, pin - 8, direction);
            this.i2cWriteByte(IODIRB, this.portBDir);
        }
    }

    IoPi.prototype.setPortDirection = function (port, direction) {
        //
        // set direction for an IO port
        // port 0 = pins 1 to 8, port 1 = pins 8 to 16
        // 1 = input, 0 = output
        //
        if (port == 1) {
            this.i2cWriteByte(IODIRB, direction);
            this.portBDir = direction;
        }
        else {
            this.i2cWriteByte(IODIRA, direction);
            this.portADir = direction;
        }
    }

    IoPi.prototype.setPinPullup = function (pinval, value) {
        //
        // set the internal 100K pull-up resistors for an individual pin
        // pins 1 to 16
        // value 1 = enabled, 0 = disabled
        //
        pin = pinval - 1;
        if (pin < 8) {
            this.portAPullup = updateByte(this.portAPullup, pin, value);
            this.i2cWriteByte(GPPUA, this.portAPullup);
        } else {
            this.portBPullup = updateByte(this.portBPullup, pin - 8, value);
            this.i2cWriteByte(GPPUB, this.portBPullup);
        }
    }

    IoPi.prototype.setPortPullups = function (port, value) {
        //
        // set the internal 100K pull-up resistors for the selected IO port
        //
        if (port == 1) {
            this.portBPullup = value;
            this.i2cWriteByte(GPPUB, value);
        } else {
            this.portAPullup = value;
            this.i2cWriteByte(GPPUA, value);
        }
    }

    IoPi.prototype.writePin = function (pin, value) {
        //
        //  write to an individual pin 1 - 16
        //
        pin = pin - 1;
        if (pin < 8) {
            this.portAVal = updateByte(this.portAVal, pin, value)
            this.i2cWriteByte(GPIOA, this.portAVal)
        } else {
            this.portBVal = updateByte(this.portBVal, pin - 8, value)
            this.i2cWriteByte(GPIOB, this.portBVal)
        }
    }

    IoPi.prototype.writePort = function (port, value) {
        //
        // write to all pins on the selected port
        // port 0 = pins 1 to 8, port 1 = pins 8 to 16
        // value = number between 0 and 255 or 0x00 and 0xFF
        //
        if (port == 1) {
            this.i2cWriteByte(GPIOB, value);
            this.portBVal = value;
        } else {
            this.i2cWriteByte(GPIOA, value);
            this.portAVal = value;
        }
    }

    IoPi.prototype.readPin = function (pinval) {
        //
        // read the value of an individual pin 1 - 16
        //  returns 0 = logic level low, 1 = logic level high
        //
        pin = pinval - 1;
        if (pin < 8) {
            this.portAVal = this.i2cReadByte(GPIOA);
            return checkBit(this.portAVal, pin);
        } else {
            pin = pin - 8
            this.portBVal = this.i2cReadByte(GPIOB);
            return checkBit(this.portBVal, pin);
        }
    }

    IoPi.prototype.readPort = function (port) {
        //
        // read all pins on the selected port
        //  port 0 = pins 1 to 8, port 1 = pins 8 to 16
        //  returns number between 0 and 255 or 0x00 and 0xFF
        //
        if (port == 1) {
            this.portBVal = this.i2cReadByte(GPIOB);
            return this.portBVal;
        } else {
            this.portAVal = this.i2cReadByte(GPIOA);
            return this.portAVal;
        }
    }

/*
    IoPi.prototype.readMcp23017Port = function (port) {
        //
        // read all pins on the selected port
        //  port 0 = pins 1 to 8, port 1 = pins 8 to 16
        //  returns number between 0 and 255 or 0x00 and 0xFF
        //
        if (port == 1) {
						i2cReadByteTest(GPIOB,function(err,res){
							if( err ) return ;
							return res + 100;
						});
        } else {
						i2cReadByteTest(GPIOA,function(err,res){            
							if( err ) return 0;
							return	res + 100;
						});
        }
    }
*/
    IoPi.prototype.invertPort = function (port, polarity) {
        //
        // invert the polarity of the pins on a selected port
        // port 0 = pins 1 to 8, port 1 = pins 8 to 16
        // polarity 0 = same logic state of the input pin, 1 = inverted logic
        // state of the input pin
        //
        if (port == 1) {
            this.i2cWriteByte(IPOLB, polarity);
            this.portBPolarity = polarity;
        } else {
            this.i2cWriteByte(IPOLA, polarity);
            this.portAPolarity = polarity;
        }
    }

    IoPi.prototype.invertPin = function (pin, polarity) {
        //
        // invert the polarity of the selected pin
        //  pins 1 to 16
        //  polarity 0 = same logic state of the input pin, 1 = inverted logic
        //  state of the input pin
        //
        pin = pin - 1;
        if (pin < 8) {
            this.portAPolarity = updateByte(this.portAPolarity, pin, polarity);
            this.i2cWriteByte(IPOLA, this.portAPolarity);
        } else {
            this.portBPolarity = updateByte(this.portBPolarity, pin - 8, polarity);
            this.i2cWriteByte(IPOLB, this.portBPolarity);
        }
    }

    IoPi.prototype.mirrorInterrupts = function (value) {
        //
        // 1 = The INT pins are internally connected, 0 = The INT pins are not
        // connected. INTA is associated with PortA and INTB is associated with
        // PortB
        //
        if (value == 0) {
            this.config = updateByte(this.config, 6, 0);
        }
        if (value == 1) {
            this.config = updateByte(this.config, 6, 1);
        }
        this.i2cWriteByte(IOCON, this.config);

    }

    IoPi.prototype.setInterruptPolarity = function (value) {
        //
        // This sets the polarity of the INT output pins - 1 = Active-high.
        //  0 = Active-low.
        //
        if (value == 0) {
            this.config = updateByte(this.config, 1, 0);
        }
        if (value == 1) {
            this.config = updateByte(this.config, 1, 1);

        }
        this.i2cWriteByte(IOCON, this.config);
    }

    IoPi.prototype.setInterruptType = function (port, value) {
        //
        // Sets the type of interrupt for each pin on the selected port
        // 1 = interrupt is fired when the pin matches the default value
        // 0 = the interrupt is fired on state change
        //
        if (port == 0) {
            this.i2cWriteByte(INTCONA, value);
        } else {
            this.i2cWriteByte(INTCONB, value);
        }
    }

    IoPi.prototype.setInterruptDefaults = function (port, value) {
        //
        // These bits set the compare value for pins configured for
        // interrupt-on-change on the selected port.
        // If the associated pin level is the opposite from the register bit, an
        // interrupt occurs.
        //
        if (port == 0) {
            this.i2cWriteByte(DEFVALA, value);
        } else {
            this.i2cWriteByte(DEFVALB, value);
        }
    }

    IoPi.prototype.setInterruptOnPort = function (port, value) {
        //
        // Enable interrupts for the pins on the selected port
        // port 0 = pins 1 to 8, port 1 = pins 8 to 16
        // value = number between 0 and 255 or 0x00 and 0xFF
        //
        if (port == 0) {
            this.i2cWriteByte(GPINTENA, value);
            intA = value;
        } else {
            this.i2cWriteByte(GPINTENB, value);
            intB = value;
        }
    }

    IoPi.prototype.setInterruptOnPin = function (pin, value) {
        //
        // Enable interrupts for the selected pin
        // Pin = 1 to 16
        // Value 0 = interrupt disabled, 1 = interrupt enabled
        //
        pin = pin - 1;
        if (pin < 8) {
            this.intA = updateByte(this.intA, pin, value);
            this.i2cWriteByte(GPINTENA, this.intA);
        } else {
            this.intB = updateByte(this.intB, pin - 8, value);
            this.i2cWriteByte(GPINTENB, this.intB);
        }
    }

    IoPi.prototype.readInterruptStatus = function (port) {
        //
        // read the interrupt status for the pins on the selected port
        // port 0 = pins 1 to 8, port 1 = pins 8 to 16
        //
        if (port == 0) {
            return this.i2cReadByte(INTFA);
        } else {
            return this.i2cReadByte(INTFB);
        }
    }

    IoPi.prototype.readInterruptCapture = function (port) {
        //
        // read the value from the selected port at the time of the last
        // interrupt trigger
        // port 0 = pins 1 to 8, port 1 = pins 8 to 16
        //
        if (port == 0) {
            return this.i2cReadByte(INTCAPA);
        }
        else {
            return this.i2cReadByte(INTCAPB);
        }
    }

    IoPi.prototype.resetInterrupts = function () {
        //
        // set the interrupts A and B to 0
        //
        this.readInterruptCapture(0);
        this.readInterruptCapture(1);
    }


    return IoPi;

})();

module.exports = IoPi;
