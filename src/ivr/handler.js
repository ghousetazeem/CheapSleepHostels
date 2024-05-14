require('dotenv').config();
const { VOICEFLOW_API_KEY } = process.env;

const VoiceResponse = require('twilio').twiml.VoiceResponse;
const axios = require('axios');
const twilio = require('twilio');
//const client = new twilio("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN")
const client = new twilio('AC7e8bfb6ee69ee4a5325b996fcc6b6948', '3e0f72a9b7139d880482d91cd2e4e592');

// Helper function to check if a query is related to appointments
function isAppointmentRelated(query) {
  const appointmentKeywords = ['appointment', 'booking', 'reserve', 'reservation', 'schedule'];
  return appointmentKeywords.some(keyword => query.toLowerCase().includes(keyword));
}

async function interactKB(caller, action) {
  const twiml = new VoiceResponse();
  let assistantResponse = null;

  if (action?.payload) {
    if (isAppointmentRelated(action.payload)) {
      // Send SMS with the link to OYO
      await client.messages.create({
        body: 'You can book your appointment here: https://oyo.com',
        from: '+15738804640',
        to: caller // Use the caller's phone number
      });

      assistantResponse = 'I have sent you an SMS with the booking link.';
    } else {
      const request = {
        method: 'POST',
        url: `https://general-runtime.voiceflow.com/knowledge-base/query`,
        headers: { Authorization: "VF.DM.6641c0b7e59bf4b044cc453c.6g5aFHXFLqYcYjMh" },
        data: {
          chunkLimit: 2,
          synthesis: true,
          settings: {
            model: 'gpt-3.5-turbo',
            temperature: 0.1,
            system: `You are Laura, a virtual assistant designed for assisting with queries related to the cheap sleep hostel which is located in Helsinki, Finland, a cheap and best accommodations known for its exceptional services and facilities. Your role is to accurately address 80% of routine inquiries regarding the hotel accommodations, amenities, bookings, and policies.

Follow these specific guidelines in your responses:

Immediate Addressing of Queries: Begin each response by immediately addressing the user's question, avoiding any introductory phrases like "Thanks for asking" or similar constructions.

Exclude Greetings and Salutations: Do not use greetings or salutations such as "Hello," or "Thank you for reaching out." Start directly with the relevant information pertaining to the user's query.

Confined Information Sharing: Only share information if you are at least 95% certain of its relevance and accuracy, and solely based on the provided documents. If uncertain, respond with "I'm sorry, I can't provide a reliable answer based on the information available to me."

Strict Prohibition of False Information: Provide only true information based on the documents provided to you. If a query cannot be answered with this information, clearly state, "I'm sorry, I can't provide a reliable answer based on the information available to me."

No Action Execution: You are not authorized to perform actions such as making or canceling reservations for users. Direct users to the appropriate pages and resources for these actions, strictly following the resort's policies and procedures.

Appropriate Response Format and Tone: Responses should be in well-structured paragraphs and maintain a tone consistent with the Blue Horizon Resort's image. Use "we," "us," and "our" when referring to the resort. Avoid lengthy texts or bullet points. If the information is not available to answer a query, use the phrase, "I'm sorry, I can't provide a reliable answer based on the information available to me."

Absolute Exclusion of Follow-Up Questions: Do not include follow-up questions such as "May I assist with anything else?" or "Do you have any more questions?" Focus solely on the query at hand without initiating further dialogue.

Your main objective is to provide clear, accurate, and relevant information while ensuring effective communication and strictly adhering to these guidelines. Use a friendly tone in your responses and feel free to use emojis to enhance communication.`
          },
          question: action?.payload
        },
      };

      const response = await axios(request);

      if (response?.data?.output) {
        assistantResponse = response.data.output;
      } else {
        assistantResponse = 'Sorry I can\'t help with that. Do you have any other question?';
      }
    }
  } else if (action?.type == 'launch') {
    assistantResponse = 'Hello I am Laura, speaking from cheap sleep hostels, Helsinki, how can I help you?';
  }

  console.log('Response:', assistantResponse);

  let agent = twiml.gather({
    input: 'speech dtmf',
    numDigits: 1,
    speechTimeout: 'auto',
    action: '/ivr/interaction',
    profanityFilter: false,
    actionOnEmptyResult: true,
    method: 'POST',
  });

  if (assistantResponse)
    agent.say(assistantResponse);

  return twiml.toString();
}

exports.launch = async (called, caller) => {
  return interactKB(caller, { type: 'launch' });
};

exports.test = async (called, caller) => {
  return interactKB(caller, { type: 'text', payload: 'hello who are you?' });
};

exports.interaction = async (called, caller, query = '', digit = null) => {
  let action = null;
  if (digit) {
    action = { type: `${digit}` };
    console.log('Digit:', digit);
  } else {
    // twilio always ends everything with a period, we remove it
    query = query.slice(0, -1);
    action = query.trim() ? { type: 'text', payload: query } : null;
    console.log('Utterance:', query);
  }
  return interactKB(caller, action);
};
