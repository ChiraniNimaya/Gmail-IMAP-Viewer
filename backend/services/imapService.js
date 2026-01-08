const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { inspect } = require('util');

class ImapService {
  constructor(user) {
    this.user = user;
    this.imap = null;
  }

  generateXOAuth2Token(user, accessToken) {
    const authString = [
      `user=${user}`,
      `auth=Bearer ${accessToken}`,
      '',
      ''
    ].join('\x01');
    return Buffer.from(authString).toString('base64');
  }

  // Connect to Gmail IMAP with OAuth2
  connect() {
    return new Promise((resolve, reject) => {
      const xoauth2Token = this.generateXOAuth2Token(
        this.user.email,
        this.user.accessToken
      );

      this.imap = new Imap({
        user: this.user.email,
        xoauth2: xoauth2Token,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { 
          rejectUnauthorized: false,
          servername: 'imap.gmail.com'
        },
        authTimeout: 10000,
        connTimeout: 10000,
        debug: console.log 
      });

      this.imap.once('ready', () => {
        console.log('IMAP connection ready');
        resolve();
      });

      this.imap.once('error', (err) => {
        console.error('IMAP connection error:', err);
        reject(new Error(`IMAP connection failed: ${err.message}`));
      });

      this.imap.once('end', () => {
        console.log('IMAP connection ended');
      });

      try {
        this.imap.connect();
      } catch (error) {
        reject(new Error(`Failed to initiate IMAP connection: ${error.message}`));
      }
    });
  }

  async fetchEmails(mailbox = 'INBOX', limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      this.imap.openBox(mailbox, true, (err, box) => {
        if (err) {
          reject(new Error(`Failed to open mailbox: ${err.message}`));
          return;
        }

        const total = box.messages.total;
        
        if (total === 0) {
          resolve({ emails: [], total: 0 });
          return;
        }

        // Calculate range (fetch most recent emails)
        const end = Math.max(1, total - offset);
        const start = Math.max(1, end - limit + 1);

        console.log(`Fetching emails ${start}:${end} from ${total} total`);

        const fetch = this.imap.seq.fetch(`${start}:${end}`, {
          bodies: ['HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE MESSAGE-ID)', 'TEXT', ''],
          struct: true,
          markSeen: false
        });

        const emails = [];
        let processed = 0;
        const expectedCount = end - start + 1;

        fetch.on('message', (msg, seqno) => {
          const emailData = {
            seqno: seqno,
            attributes: null,
            headers: null,
            body: '',
            fullBody: ''
          };

          msg.on('body', (stream, info) => {
            let buffer = '';
            
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });

            stream.once('end', () => {
              if (info.which === '') {
                emailData.fullBody = buffer;
              } else if (info.which.includes('HEADER')) {
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
            processed++;
          });
        });

        fetch.once('error', (err) => {
          reject(new Error(`Fetch error: ${err.message}`));
        });

        fetch.once('end', async () => {
          console.log(`Fetched ${processed} emails`);
          try {
            const parsedEmails = await this.parseEmails(emails);
            resolve({ emails: parsedEmails, total });
          } catch (error) {
            reject(new Error(`Parse error: ${error.message}`));
          }
        });
      });
    });
  }

  async parseEmails(rawEmails) {
    const parsed = [];

    for (const email of rawEmails) {
      try {
        const headers = email.headers || {};
        
        let bodyPreview = '';
        let bodyText = '';
        let bodyHtml = '';

        if (email.fullBody) {
          try {
            const parsedMail = await simpleParser(email.fullBody);
            bodyText = parsedMail.text || '';
            bodyHtml = parsedMail.html || parsedMail.textAsHtml || '';
            bodyPreview = bodyText.substring(0, 200).replace(/\n/g, ' ').trim();
          } catch (parseError) {
            console.error('Error parsing email body:', parseError.message);
            bodyPreview = email.body ? email.body.substring(0, 200) : '';
          }
        }

        const fromAddress = headers.from ? headers.from[0] : '';
        const fromMatch = fromAddress.match(/<(.+?)>/) || [null, fromAddress];
        const fromEmail = fromMatch[1] || fromAddress;
        const fromNameMatch = fromAddress.match(/^"?([^"<]+)"?\s*</);
        const fromName = fromNameMatch ? fromNameMatch[1].trim() : fromEmail;

        let receivedDate = new Date();
        if (headers.date && headers.date[0]) {
          try {
            receivedDate = new Date(headers.date[0]);
          } catch (e) {
            console.error('Error parsing date:', e.message);
          }
        }

        parsed.push({
          messageId: headers['message-id'] ? headers['message-id'][0] : `${Date.now()}-${email.seqno}`,
          subject: headers.subject ? headers.subject[0] : '(No Subject)',
          fromAddress: fromEmail,
          fromName: fromName,
          toAddress: headers.to ? headers.to.join(', ') : '',
          ccAddress: headers.cc ? headers.cc.join(', ') : '',
          bccAddress: headers.bcc ? headers.bcc.join(', ') : '',
          receivedDate: receivedDate,
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
        console.error('Error parsing individual email:', error.message);
      }
    }

    return parsed;
  }

  hasAttachments(struct) {
    if (!struct) return false;
    
    const checkStruct = (part) => {
      if (Array.isArray(part)) {
        return part.some(checkStruct);
      }
      if (part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT') {
        return true;
      }
      return false;
    };

    return checkStruct(struct);
  }

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

  async searchEmails(criteria, limit = 50) {
    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          reject(new Error(`Failed to open mailbox: ${err.message}`));
          return;
        }

        // Convert search criteria to IMAP format
        let searchCriteria = ['ALL'];
        if (typeof criteria === 'string') {
          searchCriteria = [['OR', ['SUBJECT', criteria], ['FROM', criteria]]];
        } else {
          searchCriteria = criteria;
        }

        this.imap.search(searchCriteria, (err, results) => {
          if (err) {
            reject(new Error(`Search error: ${err.message}`));
            return;
          }

          if (!results || results.length === 0) {
            resolve({ emails: [], total: 0 });
            return;
          }

          const resultLimit = results.slice(-limit);
          
          const fetch = this.imap.fetch(resultLimit, {
            bodies: ['HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE MESSAGE-ID)', 'TEXT', ''],
            struct: true,
            markSeen: false
          });

          const emails = [];

          fetch.on('message', (msg, seqno) => {
            const emailData = {
              seqno: seqno,
              attributes: null,
              headers: null,
              body: '',
              fullBody: ''
            };

            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });

              stream.once('end', () => {
                if (info.which === '') {
                  emailData.fullBody = buffer;
                } else if (info.which.includes('HEADER')) {
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
            reject(new Error(`Fetch error: ${err.message}`));
          });

          fetch.once('end', async () => {
            try {
              const parsedEmails = await this.parseEmails(emails);
              resolve({ emails: parsedEmails, total: results.length });
            } catch (error) {
              reject(new Error(`Parse error: ${error.message}`));
            }
          });
        });
      });
    });
  }

  async deleteEmail(messageId) {
    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(new Error(`Failed to open mailbox: ${err.message}`));
          return;
        }

        this.imap.search([['HEADER', 'MESSAGE-ID', messageId]], (err, results) => {
          if (err) {
            reject(new Error(`Search failed: ${err.message}`));
            return;
          }

          if (!results || results.length === 0) {
            reject(new Error('Email not found on server'));
            return;
          }

          this.imap.addFlags(results, '\\Deleted', (err) => {
            if (err) {
              reject(new Error(`Failed to mark email as deleted: ${err.message}`));
              return;
            }

            // Permanently remove deleted emails
            this.imap.expunge((err) => {
              if (err) {
                reject(new Error(`Failed to expunge: ${err.message}`));
                return;
              }

              console.log(`Email deleted from Gmail: ${messageId}`);
              resolve(true);
            });
          });
        });
      });
    });
  }

  disconnect() {
    if (this.imap) {
      try {
        this.imap.end();
      } catch (error) {
        console.error('Error disconnecting IMAP:', error.message);
      }
    }
  }
}

module.exports = ImapService;