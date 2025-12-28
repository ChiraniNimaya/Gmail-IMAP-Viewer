const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { inspect } = require('util');

class ImapService {
  constructor(user) {
    this.user = user;
    this.imap = null;
  }

  // Connect to Gmail IMAP
  connect() {
    return new Promise((resolve, reject) => {
      this.imap = new Imap({
        user: this.user.email,
        password: this.user.accessToken,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
        xoauth2: this.user.accessToken
      });

      this.imap.once('ready', () => {
        console.log('IMAP connection ready');
        resolve();
      });

      this.imap.once('error', (err) => {
        console.error('IMAP connection error:', err);
        reject(err);
      });

      this.imap.once('end', () => {
        console.log('IMAP connection ended');
      });

      this.imap.connect();
    });
  }

  // Fetch emails from a mailbox
  async fetchEmails(mailbox = 'INBOX', limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      this.imap.openBox(mailbox, true, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        const total = box.messages.total;
        
        if (total === 0) {
          resolve({ emails: [], total: 0 });
          return;
        }

        // Calculate range
        const end = Math.max(1, total - offset);
        const start = Math.max(1, end - limit + 1);

        const fetch = this.imap.seq.fetch(`${start}:${end}`, {
          bodies: ['HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE MESSAGE-ID)', 'TEXT'],
          struct: true
        });

        const emails = [];

        fetch.on('message', (msg, seqno) => {
          const emailData = {
            seqno: seqno,
            attributes: null,
            headers: null,
            body: null
          };

          msg.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });

            stream.once('end', () => {
              if (info.which.includes('HEADER')) {
                emailData.headers = Imap.parseHeader(buffer);
              } else {
                emailData.body = buffer;
              }
            });
          });

          msg.once('attributes', (attrs) => {
            emailData.attributes = attrs;
          });

          msg.once('end', () => {
            emails.push(emailData);
          });
        });

        fetch.once('error', (err) => {
          reject(err);
        });

        fetch.once('end', async () => {
          try {
            const parsedEmails = await this.parseEmails(emails);
            resolve({ emails: parsedEmails, total });
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }

  // Parse email data
  async parseEmails(rawEmails) {
    const parsed = [];

    for (const email of rawEmails) {
      try {
        const headers = email.headers || {};
        
        // Parse body if available
        let bodyPreview = '';
        let bodyText = '';
        let bodyHtml = '';

        if (email.body) {
          try {
            const parsed = await simpleParser(email.body);
            bodyText = parsed.text || '';
            bodyHtml = parsed.html || '';
            bodyPreview = (bodyText || '').substring(0, 200);
          } catch (parseError) {
            console.error('Error parsing email body:', parseError);
          }
        }

        const fromAddress = headers.from ? headers.from[0] : '';
        const fromMatch = fromAddress.match(/<(.+?)>/) || fromAddress.match(/(.+)/);
        const fromEmail = fromMatch ? fromMatch[1] : fromAddress;
        const fromNameMatch = fromAddress.match(/^"?(.+?)"?\s*</);
        const fromName = fromNameMatch ? fromNameMatch[1] : fromEmail;

        parsed.push({
          messageId: headers['message-id'] ? headers['message-id'][0] : `${Date.now()}-${email.seqno}`,
          subject: headers.subject ? headers.subject[0] : '(No Subject)',
          fromAddress: fromEmail,
          fromName: fromName,
          toAddress: headers.to ? headers.to.join(', ') : '',
          ccAddress: headers.cc ? headers.cc.join(', ') : '',
          bccAddress: headers.bcc ? headers.bcc.join(', ') : '',
          receivedDate: headers.date ? new Date(headers.date[0]) : new Date(),
          bodyPreview: bodyPreview,
          bodyText: bodyText,
          bodyHtml: bodyHtml,
          hasAttachments: email.attributes?.struct ? this.hasAttachments(email.attributes.struct) : false,
          attachmentCount: email.attributes?.struct ? this.countAttachments(email.attributes.struct) : 0,
          isRead: email.attributes?.flags ? email.attributes.flags.includes('\\Seen') : false,
          size: email.attributes?.size || 0,
          flags: email.attributes?.flags || [],
          uid: email.attributes?.uid || null
        });
      } catch (error) {
        console.error('Error parsing individual email:', error);
      }
    }

    return parsed;
  }

  // Check if email has attachments
  hasAttachments(struct) {
    if (!struct) return false;
    
    const checkStruct = (part) => {
      if (Array.isArray(part)) {
        return part.some(checkStruct);
      }
      if (part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT') {
        return true;
      }
      if (part.subtype && part.subtype.toUpperCase() !== 'PLAIN' && 
          part.subtype.toUpperCase() !== 'HTML') {
        return true;
      }
      return false;
    };

    return checkStruct(struct);
  }

  // Count attachments
  countAttachments(struct) {
    if (!struct) return 0;
    
    let count = 0;
    const checkStruct = (part) => {
      if (Array.isArray(part)) {
        part.forEach(checkStruct);
      } else if (part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT') {
        count++;
      }
    };

    checkStruct(struct);
    return count;
  }

  // Search emails
  async searchEmails(criteria, limit = 50) {
    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        this.imap.search(criteria, (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            resolve({ emails: [], total: 0 });
            return;
          }

          const resultLimit = results.slice(-limit);
          
          const fetch = this.imap.fetch(resultLimit, {
            bodies: ['HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE MESSAGE-ID)', 'TEXT'],
            struct: true
          });

          const emails = [];

          fetch.on('message', (msg, seqno) => {
            const emailData = {
              seqno: seqno,
              attributes: null,
              headers: null,
              body: null
            };

            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });

              stream.once('end', () => {
                if (info.which.includes('HEADER')) {
                  emailData.headers = Imap.parseHeader(buffer);
                } else {
                  emailData.body = buffer;
                }
              });
            });

            msg.once('attributes', (attrs) => {
              emailData.attributes = attrs;
            });

            msg.once('end', () => {
              emails.push(emailData);
            });
          });

          fetch.once('error', (err) => {
            reject(err);
          });

          fetch.once('end', async () => {
            try {
              const parsedEmails = await this.parseEmails(emails);
              resolve({ emails: parsedEmails, total: results.length });
            } catch (error) {
              reject(error);
            }
          });
        });
      });
    });
  }

  // Close connection
  disconnect() {
    if (this.imap) {
      this.imap.end();
    }
  }
}

module.exports = ImapService;