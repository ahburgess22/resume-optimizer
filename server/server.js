// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const natural = require('natural');
const cors = require('cors');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Initialize the tokenizer for keyword extraction
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Load initial resume data
const resumeData = {
  name: "AUSTIN BURGESS",
  contact: "Hughesville, MD | (240) 721-0742 | ahburgess22@gmail.com | https://www.linkedin.com/in/austin-burgess-swarthmore/",
  summary: "Motivated backend engineer with a focus on full-stack development and a developing expertise in frontend technologies. Proficient in Python, TypeScript, Swift, and SQL, underpinned by a foundation in system design and data analytics. Proven ability to quickly learn and implement new frameworks and tools, excelling in fast-paced startup environments.",
  experience: [
    {
      company: "LevelGolf",
      title: "iOS UI/UX Developer",
      date: "Jan 2025 - Current",
      responsibilities: [
        "Developing iOS screens using Swift, enhancing UI and UX by integrating API endpoints for seamless data flow, playing a pivotal role in defining the app's navigation and functional architecture.",
        "Primarily responsible for API calls integration, enhancing screen functionality and data interaction, validating through testing with Postman.",
        "Quickly adapting to and leading the UX design aspect of the project, contributing significantly within a week to the app's functionality based on an established codebase with AI support.",
        "Collaborating closely with a team using Bitbucket for version control and strategic development meetings."
      ]
    },
    {
      company: "StatStak",
      title: "Data Scientist / Software Engineer",
      date: "Aug 2020 - August 2022",
      responsibilities: [
        "Developed and improved a proof-of-concept web app in Python, optimizing baseball analytics by 30% using web scraping and API integration.",
        "Led a sub-group of developers to produce an MVP web app in R, showcasing to clients and iterating on feedback.",
        "Collaborated with engineering and executive teams in a fast-paced startup environment, delivering with agile methods."
      ]
    }
  ],
  projects: [
    {
      name: "Personal Website",
      role: "Front-End Developer",
      date: "Feb 2025",
      description: [
        "Developed a personal portfolio website using React and TypeScript, showcasing professional milestones, coding journey, personal story, and enhancing online presence and networking opportunities.",
        "Leveraged Tailwind CSS for custom design and Vercel for continuous deployment, streamlining development workflow directly linked to GitHub.",
        "Expanded front-end development skills, displaying adaptability in learning new technologies (TypeScript, Tailwind)"
      ]
    },
    {
      name: "Dynamic Staking dApp",
      role: "Blockchain Engineer",
      date: "Jan 2025",
      description: [
        "Designed and implemented an ERC-721 staking dApp with dynamic NFT rewards, utilizing Solidity and OpenZeppelin libraries.",
        "Simulated real-world staking scenarios in decentralized finance (DeFi), enabling secure, rarity-based reward distribution to incentivize user engagement.",
        "Designed and deployed a comprehensive smart contract suite (DynamicStakingPool, MasterRegistry, RewardToken) enabling secure and variable-reward staking mechanisms.",
        "Built modular contracts to ensure scalability, including a fungible reward token (ERC-20) and metadata-rich NFTs.",
        "Wrote 100% test coverage using Hardhat, Mocha, and Chai; delivered a clean, production-grade GitHub repository with a polished README, architecture diagrams, and extensive documentation."
      ]
    }
  ],
  education: [
    {
      institution: "Isenberg School of Management",
      location: "Amherst, MA",
      degree: "MS in Business Analytics",
      gpa: "3.96 GPA",
      additional: "Captain -- Varsity Baseball"
    },
    {
      institution: "Swarthmore College",
      location: "Swarthmore, PA",
      degree: "BA in Computer Science",
      additional: "Captain -- Varsity Baseball"
    }
  ],
  skills: [
    "Python", "SQL", "JavaScript", "TypeScript", "Swift", "Solidity", "R",
    "Flask", "React", "Node.js", "Git", "Bitbucket", "MongoDB", "PostgreSQL", 
    "Firebase", "Heroku", "Vercel", "Systems Design", "RStudio", 
    "Data Analytics", "Tableau", "Advanced Excel"
  ]
};

// Helper functions
function extractKeywords(text) {
  // Tokenize the text and filter out stop words
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'in', 'to', 'for', 'with', 'of', 'on', 'at'];
  
  const filteredTokens = tokens.filter(token => 
    token.length > 2 && !stopWords.includes(token) && /^[a-z0-9]+$/i.test(token)
  );
  
  // Stem the tokens to match variations of the same word
  const stemmedTokens = filteredTokens.map(token => stemmer.stem(token));
  
  // Count token frequencies
  const tokenFreq = {};
  stemmedTokens.forEach(token => {
    tokenFreq[token] = (tokenFreq[token] || 0) + 1;
  });
  
  // Sort by frequency and return top keywords
  return Object.entries(tokenFreq)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .slice(0, 50); // Get top 50 keywords
}

function calculateATSScore(resume, jobDescription) {
  // Extract keywords from resume and job description
  const resumeText = `
    ${resume.name} 
    ${resume.summary} 
    ${resume.experience.map(job => `${job.title} ${job.company} ${job.responsibilities.join(' ')}`).join(' ')}
    ${resume.projects.map(project => `${project.name} ${project.role} ${project.description.join(' ')}`).join(' ')}
    ${resume.education.map(edu => `${edu.institution} ${edu.degree} ${edu.location}`).join(' ')}
    ${resume.skills.join(' ')}
  `;
  
  const resumeKeywords = extractKeywords(resumeText);
  const jobKeywords = extractKeywords(jobDescription);
  
  // Calculate matching keywords
  const matchingKeywords = resumeKeywords.filter(keyword => 
    jobKeywords.some(jobKeyword => jobKeyword === keyword)
  );
  
  // Calculate score based on percentage of job keywords found in resume
  const score = Math.round((matchingKeywords.length / jobKeywords.length) * 100);
  
  // Generate feedback
  const feedback = [];
  const missingKeywords = jobKeywords.filter(keyword => 
    !resumeKeywords.some(resumeKeyword => resumeKeyword === keyword)
  ).slice(0, 10); // Get top 10 missing keywords
  
  // Format feedback
  if (score > 80) {
    feedback.push({ type: 'positive', message: 'Your resume is well-optimized for this job.' });
  } else {
    feedback.push({ type: 'negative', message: 'Your resume needs optimization for this job.' });
  }
  
  if (matchingKeywords.length > 0) {
    feedback.push({ 
      type: 'positive', 
      message: `Found ${matchingKeywords.length} matching keywords including: ${matchingKeywords.slice(0, 5).join(', ')}` 
    });
  }
  
  if (missingKeywords.length > 0) {
    feedback.push({ 
      type: 'negative', 
      message: `Missing ${missingKeywords.length} important keywords from job description.` 
    });
  }
  
  // Check for formatting issues
  if (!resumeText.includes(resume.name.toUpperCase())) {
    feedback.push({ 
      type: 'negative', 
      message: 'Your name should be in a standard format for ATS systems.' 
    });
  }
  
  return {
    score,
    feedback,
    matchingKeywords: matchingKeywords.slice(0, 15),  // Return top 15 matching keywords
    missingKeywords: missingKeywords,
  };
}

// Function to parse resume text into structured data
function parseResumeText(resumeText) {
  try {
    console.log('Starting resume parsing...');
    
    if (!resumeText || typeof resumeText !== 'string') {
      console.error('Invalid resume text:', resumeText);
      throw new Error('Invalid resume text format');
    }
    
    // Normalize line breaks and split into sections
    const normalizedText = resumeText.replace(/\r\n/g, '\n');
    const sections = normalizedText.split(/\n{2,}/);
    
    console.log(`Found ${sections.length} sections in resume`);
    
    // Create a basic resume structure with defaults
    const parsedResume = {
      name: sections[0]?.trim() || "Unknown Name",
      contact: sections[1]?.trim() || "",
      summary: "",
      experience: [],
      education: [],
      skills: []
    };
    
    console.log('Extracted name:', parsedResume.name);
    console.log('Extracted contact:', parsedResume.contact);
    
    // Look for common section headers
    let currentSection = null;
    
    // First pass: identify sections
    const sectionMap = {};
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      
      if (!section) continue;
      
      if (/^(SUMMARY|PROFESSIONAL SUMMARY|PROFILE)/i.test(section)) {
        sectionMap.summary = i;
      } 
      else if (/^(EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|PROFESSIONAL EXPERIENCE)/i.test(section)) {
        sectionMap.experience = i;
      }
      else if (/^(EDUCATION|ACADEMIC BACKGROUND|QUALIFICATIONS)/i.test(section)) {
        sectionMap.education = i;
      }
      else if (/^(SKILLS|TECHNICAL SKILLS|COMPETENCIES|EXPERTISE)/i.test(section)) {
        sectionMap.skills = i;
      }
    }
    
    console.log('Identified sections:', Object.keys(sectionMap));
    
    // Process summary section
    if (sectionMap.summary !== undefined && sectionMap.summary + 1 < sections.length) {
      parsedResume.summary = sections[sectionMap.summary + 1].trim();
      console.log('Extracted summary');
    }
    
    // Process skills section
    if (sectionMap.skills !== undefined && sectionMap.skills + 1 < sections.length) {
      const skillsText = sections[sectionMap.skills + 1].trim();
      // Try different delimiters for skills
      let skills = [];
      if (skillsText.includes(',')) {
        skills = skillsText.split(',');
      } else if (skillsText.includes('•')) {
        skills = skillsText.split('•');
      } else if (skillsText.includes('|')) {
        skills = skillsText.split('|');
      } else {
        // If no delimiter found, try to split by lines
        skills = skillsText.split('\n');
      }
      
      parsedResume.skills = skills.map(skill => skill.trim()).filter(Boolean);
      console.log(`Extracted ${parsedResume.skills.length} skills`);
    }
    
    // Process experience section
    if (sectionMap.experience !== undefined) {
      let experienceStartIndex = sectionMap.experience + 1;
      let experienceEndIndex;
      
      // Find the end of the experience section
      const nextSectionIndices = Object.values(sectionMap).filter(index => index > sectionMap.experience);
      if (nextSectionIndices.length > 0) {
        experienceEndIndex = Math.min(...nextSectionIndices);
      } else {
        experienceEndIndex = sections.length;
      }
      
      // Process experience entries
      let currentJob = null;
      for (let i = experienceStartIndex; i < experienceEndIndex; i++) {
        const section = sections[i].trim();
        if (!section) continue;
        
        const lines = section.split('\n');
        
        // Check if this is a new job entry (usually starts with a title/company line)
        const potentialJobTitle = lines[0].trim();
        const isDateLine = /\d{4}\s*(-|–|to)\s*(\d{4}|present|current)/i.test(potentialJobTitle);
        
        if (!isDateLine && lines.length >= 2) {
          // This looks like a new job entry
          
          // Extract title and company
          let title = "", company = "";
          if (potentialJobTitle.includes(' at ')) {
            [title, company] = potentialJobTitle.split(' at ').map(s => s.trim());
          } else if (potentialJobTitle.includes(',')) {
            [title, company] = potentialJobTitle.split(',').map(s => s.trim());
          } else {
            title = potentialJobTitle;
          }
          
          // Find date line
          const dateLine = lines.find(line => /\d{4}\s*(-|–|to)\s*(\d{4}|present|current)/i.test(line)) || lines[1];
          
          // Extract responsibilities (everything after the title and date)
          const dateLineIndex = lines.findIndex(line => line.trim() === dateLine.trim());
          const startIndex = dateLineIndex >= 0 ? dateLineIndex + 1 : 2;
          const responsibilities = lines.slice(startIndex).filter(Boolean).map(line => line.trim());
          
          currentJob = {
            title,
            company,
            date: dateLine.trim(),
            responsibilities
          };
          
          parsedResume.experience.push(currentJob);
        } else if (currentJob) {
          // This is likely additional information for the current job
          // Add these lines as additional responsibilities
          currentJob.responsibilities.push(...lines.filter(Boolean).map(line => line.trim()));
        }
      }
      
      console.log(`Extracted ${parsedResume.experience.length} experience entries`);
    }
    
    // Process education section
    if (sectionMap.education !== undefined) {
      let educationStartIndex = sectionMap.education + 1;
      let educationEndIndex;
      
      // Find the end of the education section
      const nextSectionIndices = Object.values(sectionMap).filter(index => index > sectionMap.education);
      if (nextSectionIndices.length > 0) {
        educationEndIndex = Math.min(...nextSectionIndices);
      } else {
        educationEndIndex = sections.length;
      }
      
      // Process education entries
      for (let i = educationStartIndex; i < educationEndIndex; i++) {
        const section = sections[i].trim();
        if (!section) continue;
        
        const lines = section.split('\n').filter(Boolean).map(line => line.trim());
        
        if (lines.length >= 1) {
          const institution = lines[0];
          const degree = lines.find(line => /degree|bachelor|master|phd|diploma|certificate/i.test(line)) || "";
          const location = lines.find(line => /^[A-Za-z\s]+,\s*[A-Za-z]{2}$/.test(line.trim())) || "";
          const gpa = lines.find(line => /gpa|grade/i.test(line)) || "";
          
          parsedResume.education.push({
            institution,
            degree: degree.trim(),
            location: location.trim(),
            gpa: gpa.trim(),
            additional: ""
          });
        }
      }
      
      console.log(`Extracted ${parsedResume.education.length} education entries`);
    }
    
    // Ensure we have at least empty arrays for required sections
    if (!parsedResume.experience.length) {
      console.log('No experience entries found, adding empty array');
      parsedResume.experience = [];
    }
    
    if (!parsedResume.education.length) {
      console.log('No education entries found, adding empty array');
      parsedResume.education = [];
    }
    
    if (!parsedResume.skills.length) {
      console.log('No skills found, adding empty array');
      parsedResume.skills = [];
    }
    
    console.log('Resume parsing completed successfully');
    return parsedResume;
  } catch (error) {
    console.error('Error parsing resume:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}

// Function to optimize resume based on job description
function optimizeResume(resume, jobDescription) {
  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobDescription);
  
  // Create a deep copy of the resume to modify
  const optimizedResume = JSON.parse(JSON.stringify(resume));
  
  // Track changes made for the summary
  const changes = [];
  const keywordsAdded = [];
  const sectionsImproved = [];
  
  // Optimize summary
  if (optimizedResume.summary) {
    const originalSummary = optimizedResume.summary;
    
    // Find missing important keywords
    const summaryKeywords = extractKeywords(originalSummary);
    const missingSummaryKeywords = jobKeywords.filter(keyword => 
      !summaryKeywords.some(summaryKeyword => summaryKeyword === keyword)
    ).slice(0, 5); // Get top 5 missing keywords
    
    if (missingSummaryKeywords.length > 0) {
      // Enhance summary with missing keywords
      let enhancedSummary = originalSummary;
      
      // Add missing keywords naturally to the summary
      if (missingSummaryKeywords.length > 0) {
        const keywordPhrase = ` with expertise in ${missingSummaryKeywords.join(', ')}`;
        
        // Check if summary ends with a period
        if (enhancedSummary.trim().endsWith('.')) {
          // Insert before the final period
          enhancedSummary = enhancedSummary.trim().slice(0, -1) + keywordPhrase + '.';
        } else {
          // Append to the end
          enhancedSummary = enhancedSummary.trim() + keywordPhrase + '.';
        }
        
        optimizedResume.summary = enhancedSummary;
        changes.push('Enhanced professional summary with relevant keywords');
        keywordsAdded.push(...missingSummaryKeywords);
        sectionsImproved.push('Professional Summary');
      }
    }
  }
  
  // Optimize skills section
  if (optimizedResume.skills && optimizedResume.skills.length > 0) {
    const originalSkills = [...optimizedResume.skills];
    
    // Find missing important skills
    const missingSkills = jobKeywords.filter(keyword => 
      !originalSkills.some(skill => 
        skill.toLowerCase().includes(keyword) || 
        stemmer.stem(skill.toLowerCase()).includes(keyword)
      )
    ).slice(0, 8); // Get top 8 missing skills
    
    if (missingSkills.length > 0) {
      // Add missing skills
      optimizedResume.skills = [...originalSkills, ...missingSkills];
      changes.push(`Added ${missingSkills.length} relevant skills from the job description`);
      keywordsAdded.push(...missingSkills);
      sectionsImproved.push('Skills');
    }
  }
  
  // Optimize experience section
  if (optimizedResume.experience && optimizedResume.experience.length > 0) {
    let experienceImproved = false;
    
    optimizedResume.experience.forEach((job, index) => {
      if (job.responsibilities && job.responsibilities.length > 0) {
        const allResponsibilitiesText = job.responsibilities.join(' ');
        const responsibilityKeywords = extractKeywords(allResponsibilitiesText);
        
        // Find missing important keywords for this job
        const missingJobKeywords = jobKeywords.filter(keyword => 
          !responsibilityKeywords.some(respKeyword => respKeyword === keyword)
        ).slice(0, 3); // Get top 3 missing keywords per job
        
        if (missingJobKeywords.length > 0 && job.responsibilities.length > 0) {
          // Enhance the first responsibility with missing keywords
          const enhancedResponsibility = job.responsibilities[0] + 
            ` Utilized ${missingJobKeywords.join(', ')} to drive results and improve efficiency.`;
          
          optimizedResume.experience[index].responsibilities[0] = enhancedResponsibility;
          experienceImproved = true;
          keywordsAdded.push(...missingJobKeywords);
        }
      }
    });
    
    if (experienceImproved) {
      changes.push('Enhanced work experience descriptions with relevant keywords');
      sectionsImproved.push('Work Experience');
    }
  }
  
  // Generate additional notes
  let notes = "The resume has been optimized to better match the job description. ";
  
  if (keywordsAdded.length > 0) {
    notes += `Added ${keywordsAdded.length} relevant keywords to increase ATS match score. `;
  }
  
  if (sectionsImproved.length > 0) {
    notes += `Improved ${sectionsImproved.length} sections to highlight your qualifications. `;
  }
  
  notes += "Remember to review the optimized resume and make any additional adjustments to ensure accuracy and authenticity.";
  
  return {
    optimizedResume,
    summary: {
      changes,
      keywordsAdded,
      sectionsImproved,
      notes
    }
  };
}

// Function to generate a .docx file from resume data
async function generateResumeDocx(resume) {
  try {
    console.log('Creating document with resume data:', JSON.stringify(resume, null, 2));
    
    // Create document sections array
    const children = [];
    
    // Add name
    children.push(
      new Paragraph({
        text: resume.name,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );
    
    // Add contact information
    if (resume.contact) {
      children.push(
        new Paragraph({
          text: resume.contact,
          alignment: AlignmentType.CENTER,
        })
      );
    }
    
    // Add summary section if it exists
    if (resume.summary) {
      children.push(
        new Paragraph({
          text: "PROFESSIONAL SUMMARY",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          text: resume.summary,
        })
      );
    }
    
    // Add skills section if it exists
    if (resume.skills && resume.skills.length > 0) {
      children.push(
        new Paragraph({
          text: "SKILLS",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          text: resume.skills.join(' • '),
        })
      );
    }
    
    // Add experience section if it exists
    if (resume.experience && resume.experience.length > 0) {
      children.push(
        new Paragraph({
          text: "EXPERIENCE",
          heading: HeadingLevel.HEADING_2,
        })
      );
      
      // Add each job
      resume.experience.forEach(job => {
        // Add job title and company
        children.push(
          new Paragraph({
            text: `${job.title || 'Position'} at ${job.company || 'Company'}`,
            heading: HeadingLevel.HEADING_3,
          })
        );
        
        // Add job date
        if (job.date) {
          children.push(
            new Paragraph({
              text: job.date,
            })
          );
        }
        
        // Add job responsibilities
        if (job.responsibilities && job.responsibilities.length > 0) {
          job.responsibilities.forEach(resp => {
            children.push(
              new Paragraph({
                text: `• ${resp}`,
              })
            );
          });
        }
        
        // Add spacing
        children.push(new Paragraph({}));
      });
    }
    
    // Add education section if it exists
    if (resume.education && resume.education.length > 0) {
      children.push(
        new Paragraph({
          text: "EDUCATION",
          heading: HeadingLevel.HEADING_2,
        })
      );
      
      // Add each education entry
      resume.education.forEach(edu => {
        // Add institution
        children.push(
          new Paragraph({
            text: edu.institution || 'Institution',
            heading: HeadingLevel.HEADING_3,
          })
        );
        
        // Add degree
        if (edu.degree) {
          children.push(
            new Paragraph({
              text: edu.degree,
            })
          );
        }
        
        // Add location
        if (edu.location) {
          children.push(
            new Paragraph({
              text: edu.location,
            })
          );
        }
        
        // Add additional info
        if (edu.additional) {
          children.push(
            new Paragraph({
              text: edu.additional,
            })
          );
        }
      });
    }
    
    // Create the document
    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });
    
    console.log('Document created successfully');
    
    // Generate the document buffer
    console.log('Generating document buffer...');
    const buffer = await Packer.toBuffer(doc);
    console.log('Document buffer generated successfully');
    
    // Create a unique filename
    const timestamp = Date.now();
    const filename = `optimized_resume_${timestamp}.docx`;
    const filePath = path.join(__dirname, filename);
    
    console.log('Writing file to:', filePath);
    // Write the file
    fs.writeFileSync(filePath, buffer);
    console.log('File written successfully');
    
    return {
      filename,
      filePath
    };
  } catch (error) {
    console.error('Error generating resume docx:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to generate resume document: ${error.message}`);
  }
}

// API Routes
app.get('/api/resume', (req, res) => {
  res.json(resumeData);
});

app.put('/api/resume', (req, res) => {
  const updatedResume = req.body;
  // In a real app, you would validate the data here
  
  // Update the resume data
  Object.assign(resumeData, updatedResume);
  
  // In a production app, you would save to a database here
  // For this example, we're just keeping it in memory
  
  res.json(resumeData);
});

app.post('/api/calculate-ats-score', (req, res) => {
  const { resume, jobDescription } = req.body;
  
  if (!resume || !jobDescription) {
    return res.status(400).json({ error: 'Missing required data' });
  }
  
  const result = calculateATSScore(resume, jobDescription);
  res.json(result);
});

app.post('/api/match-keywords', (req, res) => {
  const { resume, jobDescription } = req.body;
  
  if (!resume || !jobDescription) {
    return res.status(400).json({ error: 'Missing required data' });
  }
  
  // Extract keywords from resume and job description
  const resumeText = `
    ${resume.name} 
    ${resume.summary} 
    ${resume.experience.map(job => `${job.title} ${job.company} ${job.responsibilities.join(' ')}`).join(' ')}
    ${resume.projects.map(project => `${project.name} ${project.role} ${project.description.join(' ')}`).join(' ')}
    ${resume.education.map(edu => `${edu.institution} ${edu.degree} ${edu.location}`).join(' ')}
    ${resume.skills.join(' ')}
  `;
  
  const resumeKeywords = extractKeywords(resumeText);
  const jobKeywords = extractKeywords(jobDescription);
  
  // Find matched and missing keywords
  const matchedKeywords = jobKeywords.filter(keyword => 
    resumeKeywords.some(resumeKeyword => resumeKeyword === keyword)
  );
  
  const missingKeywords = jobKeywords.filter(keyword => 
    !resumeKeywords.some(resumeKeyword => resumeKeyword === keyword)
  );
  
  res.json({
    matchedKeywords,
    missingKeywords
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

app.post('/api/optimize-resume', async (req, res) => {
  try {
    console.log('Received optimize-resume request');
    
    // Validate request body
    if (!req.body) {
      console.error('Empty request body');
      return res.status(400).json({ error: 'Empty request body' });
    }
    
    const { resumeText, jobDescription } = req.body;
    
    // Validate required fields
    if (!resumeText) {
      console.error('Missing resume text');
      return res.status(400).json({ error: 'Resume text is required' });
    }
    
    if (!jobDescription) {
      console.error('Missing job description');
      return res.status(400).json({ error: 'Job description is required' });
    }
    
    console.log('Resume text length:', resumeText.length);
    console.log('Job description length:', jobDescription.length);
    
    console.log('Parsing resume text...');
    try {
      // Parse the resume text into structured data
      const parsedResume = parseResumeText(resumeText);
      
      if (!parsedResume) {
        console.error('Resume parsing returned null');
        return res.status(400).json({ error: 'Failed to parse resume - invalid format' });
      }
      
      console.log('Parsed resume successfully');
      
      console.log('Calculating original ATS score...');
      // Calculate original ATS score
      const originalResult = calculateATSScore(parsedResume, jobDescription);
      console.log('Original ATS score:', originalResult.score);
      
      console.log('Optimizing resume...');
      // Optimize the resume
      const { optimizedResume, summary } = optimizeResume(parsedResume, jobDescription);
      console.log('Optimization summary:', JSON.stringify(summary, null, 2));
      
      console.log('Calculating new ATS score...');
      // Calculate new ATS score
      const optimizedResult = calculateATSScore(optimizedResume, jobDescription);
      console.log('Optimized ATS score:', optimizedResult.score);
      
      console.log('Generating .docx file...');
      try {
        // Generate .docx file
        const { filename, filePath } = await generateResumeDocx(optimizedResume);
        console.log('Generated .docx file:', filename);
        
        // Create a download URL
        const downloadUrl = `/api/download/${filename}`;
        
        console.log('Sending response...');
        return res.json({
          originalScore: originalResult.score,
          optimizedScore: optimizedResult.score,
          summary,
          downloadUrl
        });
      } catch (docxError) {
        console.error('Error generating docx file:', docxError);
        console.error('Error stack:', docxError.stack);
        return res.status(500).json({ error: 'Failed to generate resume document: ' + docxError.message });
      }
    } catch (parseError) {
      console.error('Error parsing resume:', parseError);
      console.error('Error stack:', parseError.stack);
      return res.status(400).json({ error: 'Failed to parse resume: ' + parseError.message });
    }
  } catch (error) {
    console.error('Unexpected error in optimize-resume endpoint:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'An unexpected error occurred: ' + error.message });
  }
});

// Endpoint to download the generated .docx file
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, filename);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Delete the file after sending (optional)
    fileStream.on('end', () => {
      // Wait a bit before deleting to ensure the file is fully sent
      setTimeout(() => {
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }, 5000);
    });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
