const net = require('net');
const fs = require('fs');

const HOST = '127.0.0.1'; // Or replace with server IP
const PORT = 3000;

const PACKET_SIZE = 17;

let packets = new Map(); // sequenceNumber => parsedPacket

function parsePacket(buffer) {
  return {
    symbol: buffer.toString('ascii', 0, 4).trim(),
    side: buffer.toString('ascii', 4, 5),
    quantity: buffer.readInt32BE(5),
    price: buffer.readInt32BE(9),
    sequence: buffer.readInt32BE(13)
  };
}

function getMissingSequences(seqNumbers) {
  const missing = [];
  const sorted = [...seqNumbers].sort((a, b) => a - b);
  const max = sorted[sorted.length - 1];
  for (let i = sorted[0]; i <= max; i++) {
    if (!packets.has(i)) {
      missing.push(i);
    }
  }
  return missing;
}

function streamAllPackets() {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const receivedSequences = new Set();
    let leftover = Buffer.alloc(0);

    client.connect(PORT, HOST, () => {
      const request = Buffer.alloc(2);
      request.writeUInt8(1, 0); // callType 1
      request.writeUInt8(0, 1); // resendSeq not used
      client.write(request);
    });

    client.on('data', (data) => {
      data = Buffer.concat([leftover, data]);

      while (data.length >= PACKET_SIZE) {
        const packetBuf = data.slice(0, PACKET_SIZE);
        const packet = parsePacket(packetBuf);
        packets.set(packet.sequence, packet);
        receivedSequences.add(packet.sequence);
        data = data.slice(PACKET_SIZE);
      }
      leftover = data;
    });

    client.on('close', () => {
      resolve(getMissingSequences(receivedSequences));
    });

    client.on('error', (err) => reject(err));
  });
}

function requestMissingPacket(sequence) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.connect(PORT, HOST, () => {
      const request = Buffer.alloc(2);
      request.writeUInt8(2, 0); // callType 2
      request.writeUInt8(sequence, 1); // resendSeq
      client.write(request);
    });

    let buffer = Buffer.alloc(0);
    client.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      if (buffer.length >= PACKET_SIZE) {
        const packet = parsePacket(buffer.slice(0, PACKET_SIZE));
        packets.set(packet.sequence, packet);
        client.end();
        resolve();
      }
    });

    client.on('error', (err) => reject(err));
  });
}

async function main() {
  try {
    console.log('Streaming all packets...');
    const missing = await streamAllPackets();
    console.log(`Missing sequences: ${missing}`);

    for (const seq of missing) {
      console.log(`Requesting missing packet: ${seq}`);
      await requestMissingPacket(seq);
    }

    // Output all packets as sorted array to JSON
    const result = Array.from(packets.values()).sort((a, b) => a.sequence - b.sequence);
    fs.writeFileSync('output.json', JSON.stringify(result, null, 2));
    console.log('All packets written to output.json');
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
