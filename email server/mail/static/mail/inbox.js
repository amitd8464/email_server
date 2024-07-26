
document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views  
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email(undefined));
  
  document.querySelector('#compose-form').addEventListener('submit', send_email);

  // By default, load the inbox
  load_mailbox('inbox')
  
});

function compose_email(email) {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  if (email !== undefined)
  {
    // An email was passed through, so fill out composition fields for reply:
    document.querySelector('#compose-recipients').value = email.sender;
    
    // Add "Re: " prefix if it does not exist already to the subject of the email:
    email.subject.substring(0, 3) === "Re:" 
    ? document.querySelector('#compose-subject').value = email.subject 
    : document.querySelector('#compose-subject').value = "Re: " + email.subject;
    
    // Add reply prefix to body:
    document.querySelector('#compose-body').value = `On ${email.timestamp} ${email.sender} wrote:\n\n` + email.body;
  }
  else
  {
    // Clear out composition fields
    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';
  }  
  
}

function send_email(event) {
  
  event.preventDefault();

  const recipients_field = document.querySelector('#compose-recipients');
  const subject_field = document.querySelector('#compose-subject');
  const body_field = document.querySelector('#compose-body');
  body_field.value.replace(/\n/g, "<br>");
  
  fetch('/emails',
    {
      method: 'POST',
      body: JSON.stringify(
        {
          recipients: recipients_field.value,
          subject: subject_field.value,
          body: body_field.value
        })
    })
    .then(response => {
      if (response.ok) {
        load_mailbox('sent')
      }
      else {
        alert(response.error)
      }
    })
    .then(result => {
      console.log(result)
    })
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    
    // run through all emails from the selected mailbox:
    for (let i=0; i < emails.length; i++)
    {
      // Extract email from list of emails for this inbox:
      let email = emails[i];

      // Create a div for the email preview info
      const preview_info = document.createElement('div');
      preview_info.classList.add('preview-info');

      // Keep record of which email is associated with preview:
      preview_info.dataset.email_id = email.id;

      // Check if this email has been read, change CSS accordingly
      if (email.read)
      {
        preview_info.classList.add('read');
        preview_info.innerHTML = `
          <span>${email.sender} &#160 &#160 ${email.subject}</span>
          <span class='timestamp'>${email.timestamp}</span>
        `;
      } 
      else
      {
        preview_info.classList.add('unread');
        preview_info.innerHTML = `
          <span><b>${email.sender}</b> &#160 &#160 ${email.subject}</span>
          <span class='timestamp'>${email.timestamp}</span>
        `;
      }

      const email_preview = document.createElement('div');
      email_preview.classList.add('email-preview');
      email_preview.appendChild(preview_info);

      // Create a button for archiving emails:
      if (mailbox !== 'sent')
      {
        const archive = document.createElement('button');
        archive.classList.add('archive');
        archive.dataset.email_id = email.id;
        if (mailbox === 'inbox')
        {
          archive.innerHTML = `
            <img src="/static/archive.png" width="20" height="20"></img>
          `;
        }
        else if (mailbox === 'archive')
        {
          archive.innerHTML = `
            <img src="/static/unarchive.png" width="20" height="20"></img>
          `;
        }
        
        email_preview.appendChild(archive);
      }
      
      document.querySelector('#emails-view').append(email_preview);
    }

  // Click logic --> show email based on which one was clicked
  let emails_view = document.querySelector('#emails-view');
  let email_previews = emails_view.querySelectorAll('.preview-info');
  
    email_previews.forEach(function(email_preview)
    {
      // let archive_btn = emails_view.querySelector(`.archive[data-email_id="${email_preview.dataset.email_id}"]`)
      email_preview.addEventListener('click', () => view_email(email_preview));
    });
  
  // Based on mailbox, run archive or unarchive functions for .archive button clicks:
  if (mailbox === 'inbox')
  {
    let archive_buttons = emails_view.querySelectorAll('.archive');
    archive_buttons.forEach(function(archive_btn)
    {
      archive_btn.addEventListener('click', () => archive(archive_btn.dataset.email_id));
    });
  }
  else if (mailbox === 'archive')
  {
    let unarchive_buttons = emails_view.querySelectorAll('.archive');
    unarchive_buttons.forEach(function(unarchive_btn)
    {
      unarchive_btn.addEventListener('click', () => unarchive(unarchive_btn.dataset.email_id))
    });
  }

  });
}

function view_email(email_preview)
{

  let email_view = document.querySelector('#email-view');

  // Mark email as read:
  fetch(`/emails/${email_preview.dataset.email_id}`,{
    method: 'PUT',
    body: JSON.stringify({
        read: true
    })
  })
  
  // hide other views, and show the email-view
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  email_view.style.display = 'block';

  // clear page --> to prevent information from last load from showing again:

  while (email_view.firstChild) {
    email_view.removeChild(email_view.firstChild);
  }

  // create divs for info about email
  const sender = document.createElement('div');
  const recipients = document.createElement('div');
  const subject = document.createElement('div');
  const timestamp = document.createElement('div');
  const body = document.createElement('div');
  
  // adding to .body class and having white-space pre wrap to preserve newlines in email format
  body.classList.add('body');
  const line = document.createElement('hr');
  
  // access the email from API, using the passed in "email_id" argument:

  let archived = null;
  fetch(`/emails/${email_preview.dataset.email_id}`)
  .then (response => response.json())
  .then (email => 
    {
      const current_email = email;
      sender.innerHTML = `<b>From: </b>${email.sender}`;
      recipients.innerHTML = `<b>To: </b>${email.recipients}`;
      subject.innerHTML = `<b>Subject: </b>${email.subject}`;
      timestamp.innerHTML = `<b>Timestamp: </b>${email.timestamp}`;
      body.innerHTML = email.body;
      archived = email.archived;
    })

    // apply new archive button CSS
    const archive_btn = document.createElement('button');
    archive_btn.classList.add('archive');
    archive_btn.classList.add('email-archive');

    fetch(`/emails/${email_preview.dataset.email_id}`)
    .then (response => response.json())
    .then (email => 
    {
    if (email.archived)
    {
      archive_btn.innerHTML = `
        <div class='email-archive-div'>Unarchive</div>
        <img class='email-archive-img' src="/static/unarchive.png" width="10" height="10"></img>
      `;
      archive_btn.addEventListener('click', () => unarchive(email_preview.dataset.email_id))
    }
    else
    {
      archive_btn.innerHTML = `
        <div class='email-archive-div'>Archive</div>
        <img class='email-archive-img' src="/static/archive.png" width="10" height="10"></img>
      `;
      archive_btn.addEventListener('click', () => archive(email_preview.dataset.email_id))
    }
  });
    console.log(archive_btn)

    // create a reply button
    const reply_btn = document.createElement('button');
    reply_btn.classList.add('reply-btn');
    reply_btn.innerHTML = `Reply`;

    // create a container for these two buttons
    const email_btn_display = document.createElement('div');
    email_btn_display.classList.add('email-btn-display');

    email_btn_display.appendChild(archive_btn);
    email_btn_display.appendChild(reply_btn);

    // () => compose_email(current_email)

    fetch(`/emails/${email_preview.dataset.email_id}`)
    .then (response => response.json())
    .then (email => 
      {
        reply_btn.addEventListener('click', () => compose_email(email));
      });
    
    email_view.append(sender, recipients, subject, timestamp, email_btn_display, line, body);
  
}

function archive(email_id)
{
  fetch(`/emails/${email_id}`,{
    method: 'PUT',
    body: JSON.stringify({
        archived: true
    })
  })
  location.reload();
}

function unarchive(email_id)
{
  fetch(`/emails/${email_id}`,{
    method: 'PUT',
    body: JSON.stringify({
        archived: false
    })
  })
  location.reload();
}