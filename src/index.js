/*

3 byte start header, 2 byte each header
allows for id 0-15 and 16 part total size
(15packets*38bytes+37bytes=607 bytes)
(607 byte total)(1600bit fee)($0.56)new fee($0.056)

xxxx xxxx vers strt id   len

0001 1111 0000 0000 0011 0010
1f 00 /3 /2 DATA0
0001 1111 0011 0001
1f /3 /1 DATA1
0001 1111 0011 0002
1f /3 /2 DATA2

*/

var blockcast = {

};

module.exports = blockcast;