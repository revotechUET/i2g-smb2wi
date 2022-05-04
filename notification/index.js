const Mustache = require('mustache');
const find_email_by_user = require('../utils/get-user-email');
const wiNotification = require('@revotechuet/wi-notification');
let notice;
if (process.env.AWS_SMTP_USER) {
  notice = new wiNotification({
    user: process.env.AWS_SMTP_USER,
    password: process.env.AWS_SMTP_PASSWORD
  });
}



const subjectTemplate = "{{owner}} {{shareAction}} workspace {{share}} with you";
// Content template -- CHANGE IT if necessary
const footer = `
      <div style="background-color:#f2f2f2; padding: 0.5em;">
        <table style="display: table; align-items: center;">
          <td style="width: 25%; vertical-align: middle;">
            <a href="https://www.i2g.cloud/" target="_blank">
            	<img src="https://www.i2g.cloud/wp-content/uploads/i2g_logo_nopad.png" style="width: 100%;">
            </a>
          </td>
            <td style="padding-left: 1em; flex: 3;color: #0A71C0; font-weight:bolder; width: 70%;vertical-align: middle;">
                Online wellbore data interpretation and management platform.
                <br />
                Collaborate anytime, anywhere.
            </td>
        </table>
        <div style="color: #808080;font-size: 0.8em;">
          Suite 1602, 16th Floor,
          <br />
          Ruby tower - 81-85 Ham Nghi, Nguyen Thai Binh Ward, District 1, Ho Chi Minh City, Vietnam
        </div>
      </div>
`
const sharedContentTemplate = `<center>
    <div style="min-width: 400px; max-width:800px; width: 80%; border: 2px solid #e8e8e8; font-family: sans-serif; font-size: 14px; background: #fff;" align="left">
      <div style="padding: 0.5em;">
        <center style="font-size: 2em; margin: 10px;">
          Shared Workspace
        </center>
        <p>Hi <b>{{recipient}}</b>,</p>
        <p><b>{{owner}}</b> shared Workspace <b>{{share}}</b> with you. Now you can work on the Workspace</p>
        <p>You can access the shared workspace on your local machine by open the shared folder at "\\\\hcm-dtpappserv.biendongpoc.vn\\{{share}}"</p>
        <p>Sincerely,</p>
      </div>
      ${footer}
    </div>
</center>
`;
const stoppedShareContentTemplate = `<center>
    <div style="min-width: 400px; max-width:800px; width: 80%; border: 2px solid #e8e8e8; font-family: sans-serif; font-size: 14px; background: #fff;" align="left">
      <div style="padding: 0.5em;">
        <center style="font-size: 2em; margin: 10px;">
          Shared Workspace
        </center>
        <p>Hi <b>{{recipient}}</b>,</p>
        <p><b>{{owner}}</b> has stopped sharing Workspace <b>{{share}}</b> with you. You can no longer access this Workspace</p>
        <p>Sincerely,</p>
      </div>
      ${footer}
    </div>
</center>
`;

function notify(token, addedRecipients, removedRecipients, owner, share) {
  console.log("======", this.usernamePrefix, token);
  console.log(share);
  console.log("++++++");
  if (addedRecipients.length) {
    notify4AddedToShare(token, addedRecipients, owner, share, this.usernamePrefix);
  }
  if (removedRecipients.length) {
    notify4RemovedFromShare(token, removedRecipients, owner, share, this.usernamePrefix);
  }
}
async function notify4RemovedFromShare(token, recipients, owner, share, usernamePrefix) {
  console.log("SENDMAIL: REMOVED", recipients, share);
  let subject = Mustache.render(subjectTemplate, { owner, shareAction: "stopped sharing" });
  // console.log(subject);
  let content = Mustache.render(stoppedShareContentTemplate, { owner, recipient: recipients, share });
  // console.log(content);
  recipients.forEach(async recipient => {
    let i2gUsername = usernamePrefix + "_" + recipient
    find_email_by_user(token, i2gUsername).then(email => {
      if (email) {
        notice && receiver.email && receiver.email !== "" && notice.sendMail({
          to: receiver.email,
          messageHtml: content,
          subject: subject
        });
      }
    })
  })

  // TODO: call wi-notification for notification delivery (email). 
  // email's recipient = find_email_of(i2gUsername)
}
async function notify4AddedToShare(token, recipients, owner, share, usernamePrefix) {
  console.log("SENDMAIL: ADDED", recipients, share);
  let subject = Mustache.render(subjectTemplate, { owner, shareAction: "shared" });
  // console.log(subject);
  let content = Mustache.render(sharedContentTemplate, { owner, recipient: recipients, share });
  // console.log(content);

  // TODO: call wi-notification for notification delivery (email)
  recipients.forEach(async recipient => {
    let i2gUsername = usernamePrefix + "_" + recipient
    find_email_by_user(token, i2gUsername).then(email => {
      if (email) {
        notice && receiver.email && receiver.email !== "" && notice.sendMail({
          to: receiver.email,
          messageHtml: content,
          subject: subject
        });
      }
    })
  })
  // email's recipient = find_email_of(i2gUsername)
}

module.exports = notify;
