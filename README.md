
---

#  Mock Exchange Client — Technical Design & Implementation Document

---

## 1. Introduction

This document outlines the technical approach, design rationale, and implementation details of the ** Mock Exchange Client**, developed in Node.js. The client interfaces with the  TCP server to reliably retrieve order book data packets, ensuring completeness and integrity of the data stream before outputting to a structured JSON file.

---

## 2. Objective

The  client application is designed to:

* Establish a TCP connection with the  mock exchange server.
* Send requests following a binary protocol to receive streaming stock ticker packets.
* Parse and reconstruct all packets, ensuring no sequence gaps remain.
* Request any missing packets via a secondary request type.
* Persist the fully consolidated and ordered dataset as JSON.

This solution complies fully with the server specification, focusing on robustness, accuracy, and maintainability.

---

## 3. Technical Design

### 3.1 Communication Protocol

* The client connects to the server over TCP, port 3000.
* Communication is binary, not text-based.
* Two request types are supported:

  * **Stream All Packets (callType 1):** Request a full stream of packets.
  * **Resend Packet (callType 2):** Request specific packets by sequence number to recover missing data.
* Server sends fixed-length packets (17 bytes each), encoded in **big endian** format.

### 3.2 Packet Structure

Each packet consists of:

| Field        | Size (Bytes) | Description                | Encoding                    |
| ------------ | ------------ | -------------------------- | --------------------------- |
| Symbol       | 4            | Ticker symbol (ASCII)      | ASCII (Big Endian)          |
| Buy/Sell     | 1            | Order side (‘B’ or ‘S’)    | ASCII (Big Endian)          |
| Quantity     | 4            | Number of shares           | 32-bit Integer (Big Endian) |
| Price        | 4            | Price of the order         | 32-bit Integer (Big Endian) |
| Sequence Num | 4            | Packet sequence identifier | 32-bit Integer (Big Endian) |

### 3.3 Data Handling

* Incoming TCP data is buffered to handle arbitrary chunk sizes.
* The buffer accumulates bytes until a full 17-byte packet can be extracted.
* Each packet is parsed immediately upon availability.
* Sequence numbers are tracked to detect missing packets.

---

## 4. Implementation Details

### 4.1 Data Structures

* A JavaScript `Map` stores packets keyed by their sequence numbers, allowing:

  * Efficient lookup.
  * Avoidance of duplicates.
  * Easy detection of gaps in sequences.

### 4.2 Missing Packet Detection

* After receiving the initial stream (when the server closes the connection), the client:

  * Sorts received sequence numbers.
  * Computes the full expected sequence range.
  * Identifies missing sequence numbers.
* Missing packets are then requested individually using the "Resend Packet" callType.

### 4.3 Network and Asynchronous Control

* The client utilizes Node.js’s `net` module for TCP socket connections.
* Asynchronous operations use Promises and `async/await` syntax for clarity and error handling.
* Separate connections are opened for initial streaming and for each missing packet request to comply with server behavior (connection closure on initial stream completion).

### 4.4 Output Generation

* All collected packets are collated into a single array.
* The array is sorted by sequence number in ascending order.
* The final dataset is serialized into a pretty-printed JSON file (`output.json`), facilitating downstream consumption.

---

## 5. Design Rationale

### 5.1 Protocol Compliance and Reliability

* The client strictly adheres to the specified binary protocol and call types.
* It ensures no packet data is lost by detecting and recovering missing sequences.
* Proper buffer management guarantees resilience against TCP packet fragmentation.

### 5.2 Maintainability and Clarity

* Code structure is modular and readable.
* Use of native Node.js modules avoids unnecessary dependencies.
* The flow is controlled with modern asynchronous patterns for easier debugging and extension.

### 5.3 Performance Considerations

* Missing packets are requested sequentially to simplify logic and avoid overwhelming the server.
* The solution can be extended to parallelize requests if necessary.

---

## 6. Potential Enhancements

* Implement retries and timeout handling for network robustness.
* Add detailed logging with adjustable verbosity levels.
* Parallelize missing packet requests for performance optimization.
* Validate packet field ranges and data integrity beyond protocol spec.

---

## 7. Conclusion

The  Mock Exchange Client reliably fulfills the assignment’s requirements, demonstrating:

* Expertise in TCP socket programming and binary data parsing.
* Robust handling of asynchronous data streams.
* Comprehensive sequence tracking and recovery mechanisms.
* Clear, maintainable code delivering structured JSON output.

This solution provides a solid foundation for integration with larger financial or data analytics systems.



