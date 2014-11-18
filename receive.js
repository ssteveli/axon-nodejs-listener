/**
 * Created with JetBrains WebStorm.
 * User: ssteveli
 * Date: 11/17/14
 * Time: 2:58 PM
 * To change this template use File | Settings | File Templates.
 */
var amqp = require('amqp');
var bh = require('./binaryHelper.js');

var connection = amqp.createConnection({
    host: "192.168.59.103",
    port: 5672,
    login: "fitpay",
    password: "rabbitmq",
    vhost: "fitpay"
});

connection.on('ready', function() {
    connection.queue("nodejsreceiver", function(queue) {
        console.log("queue created");
        queue.bind("fitpay.axon", "*");
        queue.subscribe(function (message) {
           var axonEvent = axonEventRead(message.data);

           console.log("event: " + JSON.stringify(axonEvent));
        });
    });
});

function bin2String(array) {
    return String.fromCharCode.apply(String, array);
}

function axonEventRead(data) {
    try {
        var stream = bh.binaryHelper.convertStream(data);
        var type = stream.readByte(); // type byte
        var id = stream.readUTF();
        var timestamp = stream.readUTF();

        if (type == 3) {
            var aggId = stream.readUTF();
            var seqNum = stream.readLong();
        }

        var typeName = stream.readUTF();
        var revision = stream.readUTF();
        var payloadLength = stream.readInt();
        var payload = stream.baseRead(stream, payloadLength);
        var metadataLength = stream.readInt();
        var metadata = stream.baseRead(stream, metadataLength);

        return {
            type: type,
            identifier: id,
            timestamp: timestamp,
            aggregateIdentifier: aggId,
            sequenceNumber: seqNum,
            typeName: typeName,
            revision: revision,
            payload: bin2String(payload),
            metadata: bin2String(metadata)
        };
    } catch (err) {
        console.log('error: ' + err);
        return {}
    }
}
