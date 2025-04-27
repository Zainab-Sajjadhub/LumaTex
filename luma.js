// This JavaScript file powers the main functionality of LumaText. 
// It allows users to adjust font size and family, toggle between dark and light modes,
//  read text aloud with speech synthesis, and upload files like PDFs or text documents. 
// The uploaded content can be extracted, displayed, and summarized using an AI service. Users can also create notes by speaking through a built-in 
// speech-to-text feature. The code ensures the app remains easy to use, accessible, and interactive, especially for users with reading 
// or learning difficulties.
// Apply font size and family to all editable text areas
function applyTextStyles() {
  const size = document.getElementById("fontSize").value;
  const family = document.getElementById("fontFamily").value;

  const uploadedTextElement = document.getElementById("uploadedText");
  const summaryTextElement = document.getElementById("summaryText");
  const micNotesElement = document.getElementById("micNotes");

  if (uploadedTextElement) {
      uploadedTextElement.style.fontSize = size + "px";
      uploadedTextElement.style.fontFamily = family;
  }
  if (summaryTextElement) {
      summaryTextElement.style.fontSize = size + "px";
      summaryTextElement.style.fontFamily = family;
  }
  if (micNotesElement) {
      micNotesElement.style.fontSize = size + "px";
      micNotesElement.style.fontFamily = family;
  }
}

// Dark mode
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

// Read text
let speechSynthesisInstance = null; // Store the speech synthesis instance
function readText(text) {
  if (speechSynthesisInstance) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
  }
  let textToRead = text;
  if (!textToRead) {
      // Prioritize reading from the currently focused textarea
      const focusedElement = document.activeElement;
      if (focusedElement.id === "uploadedText" || focusedElement.id === "summaryText" || focusedElement.id === "micNotes") {
          textToRead = focusedElement.value;
      } else {
          // Fallback to reading the welcome text if nothing is focused or provided
          const welcomeTextElement = document.getElementById("text");
          if (welcomeTextElement) {
              textToRead = welcomeTextElement.textContent;
          }
      }
  }
  if (!textToRead) {
      return; // Do nothing if no text to read
  }
  speechSynthesisInstance = new SpeechSynthesisUtterance(textToRead);
  window.speechSynthesis.speak(speechSynthesisInstance);
}

function stopAudio() {
  if (speechSynthesisInstance) {
      window.speechSynthesis.cancel();
      speechSynthesisInstance = null; // Reset the instance
  }
}

// Handle Upload
async function handleUpload() {
  const fileInput = document.getElementById('fileInput').files[0];
  if (!fileInput) return alert("Please select a file.");

  if (fileInput.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async (e) => {
          const pdf = await pdfjsLib.getDocument({ data: e.target.result }).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              text += content.items.map(item => item.str).join(' ');
          }
          document.getElementById('uploadedText').value = text;
          applyTextStyles(); // Apply initial styles after upload
      };
      reader.readAsArrayBuffer(fileInput);
  } else {
      const reader = new FileReader();
      reader.onload = (e) => {
          const text = e.target.result;
          document.getElementById('uploadedText').value = text;
          applyTextStyles(); // Apply initial styles after upload
      };
      reader.readAsText(fileInput);
  }
}

// Summarize Text with Gemini (UPDATED)
async function summarizeText() {
  const text = document.getElementById('uploadedText').value.trim();
  if (!text) {
      document.getElementById('summaryText').value = ""; // Clear the summary if no text
      return;   //No alert
  }

  try {
      const response = await fetch("http://localhost:3000/summarize-text", {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify({ text: text })
      });

      if (!response.ok) {
          const errorData = await response.text();
          console.error("HTTP error summarizing text:", response.status, errorData);
          document.getElementById('summaryText').value = "Error: Summarization failed.";
          return;
      }

      const data = await response.json();
      const summary = data.summary.trim();
      document.getElementById('summaryText').value = summary;
      applyTextStyles(); // Apply styles to the summary as well
      readText(summary);

  } catch (error) {
      console.error("Error summarizing text:", error);
      document.getElementById('summaryText').value = "Error generating summary.";
  }
}

// Speech-to-text microphone
let recognition;
let isListening = false;
let finalTranscript = ''; // Accumulate final transcripts
let timeout = null; // To store the timeout for the pause in speech

function startListening() {
  const micButton = document.getElementById('micButton');
  const stopButton = document.getElementById('stopButton');
  const micNotes = document.getElementById('micNotes');

  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  } else {
      micNotes.value = "Speech recognition not supported in this browser.";
      micButton.disabled = true;
      return;
  }

  recognition.lang = 'en-US';
  micButton.style.display = 'none'; // Hide the start button
  stopButton.style.display = 'inline'; // Show the stop button
  stopButton.disabled = false;
  isListening = true;
  finalTranscript = ''; // Reset final transcript on start

  recognition.interimResults = true; // Get interim results
  recognition.maxAlternatives = 1;

  recognition.onstart = function() {
      // Optional: Provide feedback to the user.
  };

  recognition.onresult = function(event) {
      if (!isListening) return;

      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
      }

      micNotes.value = finalTranscript + transcript + ' '; // Append the result, adding space
      applyTextStyles(); // Apply styles to microphone notes as they appear

  };

  recognition.onerror = function(event) {
      if (!isListening) return;
      micButton.style.display = 'inline';
      stopButton.style.display = 'none';
      micButton.disabled = false;
      isListening = false;
      console.error("Speech recognition error:", event.error); // Log the error
  };

  recognition.onend = function() {
      micButton.style.display = 'inline';
      stopButton.style.display = 'none';
      micButton.disabled = false;
      isListening = false;
  };

  recognition.start();
}

function stopListening() {
  if (recognition) {
      recognition.stop();
  }
  const micButton = document.getElementById('micButton');
  const stopButton = document.getElementById('stopButton');
  micButton.style.display = 'inline';   // Show the start button
  stopButton.style.display = 'none'; // Hide the stop button
  micButton.disabled = false;
  isListening = false;
}

function clearMicNotes() {
  document.getElementById('micNotes').value = '';
  finalTranscript = ''; // Also clear the final transcript
}

// Play audio for the specific section
function playAudio(section) {
  stopAudio(); // Stop any currently playing audio
  const text = document.getElementById(section).value;
  readText(text);
}

// Stop audio playback for the specific section
function stopAudio() {
  if (speechSynthesisInstance) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      speechSynthesisInstance = null; // Reset the instance
  }
}