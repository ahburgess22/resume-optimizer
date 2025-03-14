// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const natural = require('natural');
const cors = require('cors');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
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

// Add this to your server.js file or in a separate route file

// Resume optimization endpoint
app.post('/api/optimize', (req, res) => {
  try {
    const { resume, jobDescription } = req.body;
    
    // Validate inputs
    if (!resume || !jobDescription) {
      return res.status(400).json({ error: 'Resume and job description are required' });
    }
    
    // Process and optimize the resume
    const result = optimizeResume(resume, jobDescription);
    
    // Return the result
    res.json(result);
  } catch (error) {
    console.error('Error optimizing resume:', error);
    res.status(500).json({ error: 'Failed to optimize resume: ' + error.message });
  }
});

// Resume optimization function
function optimizeResume(resumeText, jobDescriptionText) {
  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobDescriptionText);
  const jobTechKeywords = extractTechnicalKeywords(jobDescriptionText);
  
  // Extract role type from job description
  const roleType = determineRoleType(jobDescriptionText);
  
  // Calculate original ATS score
  const originalScore = calculateATSScore(resumeText, jobDescriptionText);
  
  // Parse the resume into sections
  const parsedResume = parseResume(resumeText);
  
  // Evaluate relevance of experiences and projects
  const relevanceScores = evaluateRelevance(parsedResume, jobDescriptionText, roleType);
  
  // Filter and reorder sections based on relevance
  const filteredResume = filterAndReorderSections(parsedResume, relevanceScores, roleType);
  
  // Tailor experiences and skills to job description
  const tailoredResume = tailorResumeContent(filteredResume, jobDescriptionText, jobKeywords, jobTechKeywords);
  
  // Generate improvements list
  const improvements = generateImprovements(parsedResume, filteredResume, tailoredResume, relevanceScores, jobKeywords);
  
  // Create formatted optimized resume
  const optimizedResume = formatOptimizedResume(tailoredResume, jobKeywords);
  
  // Calculate new score
  const optimizedScore = calculateATSScore(optimizedResume, jobDescriptionText);
  
  return {
    originalScore,
    optimizedScore,
    improvements,
    optimizedResume
  };
}
// Extract keywords from text
function extractKeywords(text) {
  const tokens = tokenizer.tokenize(text.toLowerCase());
  
  // Filter out common stop words
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 
                    'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
                    'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'i', 'you', 'he', 'she',
                    'we', 'they', 'it', 'this', 'that', 'these', 'those'];
  
  const filteredTokens = tokens.filter(token => 
    token.length > 2 && !stopWords.includes(token) && /^[a-z0-9]+$/i.test(token)
  );
  
  // Count word frequencies
  const wordFreq = {};
  filteredTokens.forEach(token => {
    const stemmed = stemmer.stem(token);
    wordFreq[stemmed] = (wordFreq[stemmed] || 0) + 1;
  });
  
  // Sort by frequency and return
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .slice(0, 50); // Get top 50 keywords
}

// Extract technical keywords that are likely to be technologies, tools, etc.
function extractTechnicalKeywords(text) {
  // Common technical terms and tools to look for
  const technicalTerms = [
    'python', 'javascript', 'typescript', 'react', 'angular', 'vue', 'node', 'express', 'flask', 
    'django', 'ruby', 'rails', 'php', 'laravel', 'java', 'spring', 'c#', '.net', 'c++', 'go', 'rust',
    'swift', 'kotlin', 'objective-c', 'flutter', 'react native', 'android', 'ios', 'aws', 'azure', 
    'gcp', 'cloud', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'git', 'github', 'gitlab', 'bitbucket',
    'jira', 'agile', 'scrum', 'kanban', 'sql', 'nosql', 'mysql', 'postgresql', 'mongodb', 'redis',
    'elasticsearch', 'kafka', 'rabbitmq', 'graphql', 'rest', 'api', 'microservices', 'architecture',
    'design patterns', 'tdd', 'unit testing', 'selenium', 'cypress', 'jest', 'mocha', 'chai',
    'webpack', 'babel', 'npm', 'yarn', 'linux', 'unix', 'bash', 'powershell', 'hadoop', 'spark',
    'ai', 'ml', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp', 'computer vision',
    'data science', 'data analysis', 'tableau', 'power bi', 'excel', 'vba', 'r', 'matlab',
    'blockchain', 'ethereum', 'solidity', 'web3', 'smart contract', 'defi', 'nft',
    'devops', 'sre', 'security', 'penetration testing', 'cryptography', 'oauth', 'jwt',
    'ux', 'ui', 'user experience', 'user interface', 'figma', 'sketch', 'adobe xd', 'photoshop',
    'illustrator', 'indesign', 'after effects', '3d modeling', 'unity', 'unreal engine',
    'product management', 'project management', 'seo', 'analytics', 'marketing',
    'firebase', 'heroku', 'vercel', 'netlify', 'aws lambda', 'serverless', 'saas'
  ];
  
  const matches = [];
  const lowerText = text.toLowerCase();
  
  technicalTerms.forEach(term => {
    if (lowerText.includes(term)) {
      matches.push(term);
    }
  });
  
  // Also extract capitalized words that might be technologies
  const techRegex = /\b[A-Z][a-zA-Z0-9]*\b|\b[A-Z][A-Z0-9]+\b/g;
  const capitalizedMatches = text.match(techRegex) || [];
  const filteredCapitalized = capitalizedMatches.filter(match => match.length > 1);
  
  // Combine and deduplicate
  return [...new Set([...matches, ...filteredCapitalized.map(m => m.toLowerCase())])];
}

// Determine the general role type from job description
function determineRoleType(jobDescription) {
  const lowerDesc = jobDescription.toLowerCase();
  
  // Define role types and their associated keywords
  const roleTypes = {
    'frontend': ['frontend', 'front-end', 'front end', 'ui', 'ux', 'react', 'angular', 'vue', 'javascript', 'typescript', 'html', 'css', 'web design'],
    'backend': ['backend', 'back-end', 'back end', 'server', 'api', 'database', 'django', 'flask', 'express', 'node.js', 'ruby on rails'],
    'fullstack': ['fullstack', 'full-stack', 'full stack', 'frontend', 'backend', 'full-stack developer'],
    'mobile': ['mobile', 'ios', 'android', 'swift', 'kotlin', 'react native', 'flutter', 'app developer'],
    'devops': ['devops', 'ci/cd', 'deployment', 'aws', 'azure', 'cloud', 'kubernetes', 'docker', 'infrastructure'],
    'data': ['data', 'analyst', 'analytics', 'machine learning', 'ml', 'ai', 'artificial intelligence', 'big data', 'data science'],
    'blockchain': ['blockchain', 'crypto', 'web3', 'ethereum', 'solidity', 'smart contract', 'nft', 'defi'],
    'product': ['product manager', 'product management', 'product owner', 'roadmap', 'user stories', 'backlog'],
    'design': ['designer', 'ux designer', 'ui designer', 'graphic', 'figma', 'sketch', 'adobe']
  };
  
  // Count matches for each role type
  const scores = {};
  for (const [type, keywords] of Object.entries(roleTypes)) {
    scores[type] = keywords.reduce((count, keyword) => {
      return count + (lowerDesc.includes(keyword) ? 1 : 0);
    }, 0);
  }
  
  // Find role type with highest score
  let highestScore = 0;
  let detectedRoleType = 'general';
  
  for (const [type, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      detectedRoleType = type;
    }
  }
  
  return detectedRoleType;
}

// Calculate ATS compatibility score
function calculateATSScore(resumeText, jobDescriptionText) {
  const resumeKeywords = extractKeywords(resumeText);
  const jobKeywords = extractKeywords(jobDescriptionText);
  
  // Count matching keywords
  let matches = 0;
  jobKeywords.forEach(jobKeyword => {
    if (resumeKeywords.some(resumeKeyword => 
      resumeKeyword.includes(jobKeyword) || jobKeyword.includes(resumeKeyword)
    )) {
      matches++;
    }
  });
  
  // Calculate score as percentage of matches
  const score = Math.floor((matches / jobKeywords.length) * 100);
  
  // Ensure score is between 30 and 90
  return Math.min(90, Math.max(30, score));
}

// Parse resume into sections
function parseResume(resumeText) {
  // Initialize parsed resume structure
  const parsedResume = {
    header: '',
    summary: '',
    skills: [],
    experience: [],
    projects: [],
    education: [],
    additionalSections: []
  };
  
  // Split resume into lines
  const lines = resumeText.split('\n').map(line => line.trim());
  
  // Extract basic contact info (typically at the top)
  let currentLine = 0;
  let contactInfo = [];
  
  // First line is usually the name
  if (lines.length > 0) {
    parsedResume.header = lines[0];
    currentLine = 1;
  }
  
  // Next few lines are usually contact info
  while (currentLine < lines.length && 
        (lines[currentLine].includes('@') || 
         lines[currentLine].includes('linkedin') ||
         lines[currentLine].includes('phone') ||
         lines[currentLine].includes('-') ||
         lines[currentLine].match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/))) {
    contactInfo.push(lines[currentLine]);
    currentLine++;
  }
  
  if (contactInfo.length > 0) {
    parsedResume.contactInfo = contactInfo.join(' | ');
  }
  
  // Identify sections
  let currentSection = '';
  let sectionContent = [];
  
  for (let i = currentLine; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line is a section header
    const isSectionHeader = line.toUpperCase() === line && line.length > 0;
    
    if (isSectionHeader || i === lines.length - 1) {
      // Save previous section content
      if (currentSection && sectionContent.length > 0) {
        if (currentSection.includes('SUMMARY') || currentSection.includes('PROFILE') || currentSection.includes('OBJECTIVE')) {
          parsedResume.summary = sectionContent.join('\n');
        } else if (currentSection.includes('EXPERIENCE') || currentSection.includes('EMPLOYMENT')) {
          parsedResume.experience = parseExperienceSection(sectionContent);
        } else if (currentSection.includes('PROJECTS') || currentSection.includes('PROJECT')) {
          parsedResume.projects = parseProjectsSection(sectionContent);
        } else if (currentSection.includes('EDUCATION')) {
          parsedResume.education = parseEducationSection(sectionContent);
        } else if (currentSection.includes('SKILLS')) {
          parsedResume.skills = parseSkillsSection(sectionContent);
        } else {
          parsedResume.additionalSections.push({
            title: currentSection,
            content: sectionContent.join('\n')
          });
        }
      }
      
      // Start new section
      if (isSectionHeader) {
        currentSection = line;
        sectionContent = [];
      }
    } else {
      // Add line to current section
      sectionContent.push(line);
    }
  }
  
  return parsedResume;
}

// Parse experience section into structured format
function parseExperienceSection(lines) {
  const experiences = [];
  let currentExperience = null;
  let bulletPoints = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') continue;
    
    // Check if this is a new job entry (contains company and date)
    if (line.includes(',') && (line.includes('-') || line.includes('–') || line.includes('to') || 
        line.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i))) {
      
      // Save previous experience if exists
      if (currentExperience) {
        currentExperience.responsibilities = bulletPoints;
        experiences.push(currentExperience);
      }
      
      // Parse job title, company, and date
      const parts = line.split(',').map(part => part.trim());
      
      currentExperience = {
        company: parts[0],
        title: parts.length > 1 ? parts[1] : '',
        date: parts.length > 2 ? parts[2] : extractDateFromLine(line),
        responsibilities: []
      };
      
      bulletPoints = [];
    } 
    // Check if this line starts with a bullet point or is indented
    else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.match(/^\s+/)) {
      // Clean up bullet point
      const cleanBullet = line.replace(/^[•\-*\s]+/, '').trim();
      if (cleanBullet) {
        bulletPoints.push(cleanBullet);
      }
    }
    // If none of the above, it might be a continuation of the job title/description
    else if (currentExperience && bulletPoints.length === 0) {
      if (!currentExperience.title) {
        currentExperience.title = line;
      } else if (!currentExperience.date) {
        currentExperience.date = extractDateFromLine(line);
      }
    }
  }
  
  // Add the last experience if exists
  if (currentExperience) {
    currentExperience.responsibilities = bulletPoints;
    experiences.push(currentExperience);
  }
  
  return experiences;
}

// Parse projects section into structured format
function parseProjectsSection(lines) {
  const projects = [];
  let currentProject = null;
  let bulletPoints = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') continue;
    
    // Check if this is a new project entry
    if ((line.includes(',') && (line.includes('Project') || line.includes('project'))) || 
        (i > 0 && lines[i-1].trim() === '' && !line.startsWith('•') && !line.startsWith('-'))) {
      
      // Save previous project if exists
      if (currentProject) {
        currentProject.description = bulletPoints;
        projects.push(currentProject);
      }
      
      // Parse project name, role, and date
      const parts = line.split(',').map(part => part.trim());
      
      currentProject = {
        name: parts[0],
        role: parts.length > 1 ? parts[1] : '',
        date: parts.length > 2 ? parts[2] : extractDateFromLine(line),
        description: []
      };
      
      bulletPoints = [];
    } 
    // Check if this line starts with a bullet point or is indented
    else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.match(/^\s+/)) {
      // Clean up bullet point
      const cleanBullet = line.replace(/^[•\-*\s]+/, '').trim();
      if (cleanBullet) {
        bulletPoints.push(cleanBullet);
      }
    }
    // If none of the above, it might be a continuation of the project title/description
    else if (currentProject && bulletPoints.length === 0) {
      if (!currentProject.role) {
        currentProject.role = line;
      } else if (!currentProject.date) {
        currentProject.date = extractDateFromLine(line);
      }
    }
  }
  
  // Add the last project if exists
  if (currentProject) {
    currentProject.description = bulletPoints;
    projects.push(currentProject);
  }
  
  return projects;
}

// Parse education section
function parseEducationSection(lines) {
  const education = [];
  let currentEducation = null;
  let bulletPoints = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') continue;
    
    // Check if this is a new education entry
    if (line.includes('University') || line.includes('College') || line.includes('School') || 
       (i > 0 && lines[i-1].trim() === '' && !line.startsWith('•') && !line.startsWith('-'))) {
      
      // Save previous education if exists
      if (currentEducation) {
        currentEducation.details = bulletPoints;
        education.push(currentEducation);
      }
      
      // Parse school and location
      const parts = line.split(',').map(part => part.trim());
      
      currentEducation = {
        institution: parts[0],
        location: parts.length > 1 ? parts[1] : '',
        degree: '',
        date: extractDateFromLine(line),
        details: []
      };
      
      bulletPoints = [];
    } 
    // Check if this line starts with a bullet point or is indented
    else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.match(/^\s+/)) {
      // Clean up bullet point
      const cleanBullet = line.replace(/^[•\-*\s]+/, '').trim();
      if (cleanBullet) {
        bulletPoints.push(cleanBullet);
      }
    }
    // If none of the above, it might be degree information
    else if (currentEducation) {
      if (!currentEducation.degree) {
        currentEducation.degree = line;
      } else {
        bulletPoints.push(line);
      }
    }
  }
  
  // Add the last education if exists
  if (currentEducation) {
    currentEducation.details = bulletPoints;
    education.push(currentEducation);
  }
  
  return education;
}

// Parse skills section
function parseSkillsSection(lines) {
  const skills = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') continue;
    
    // Check if line is a bullet point
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      const cleanSkill = line.replace(/^[•\-*\s]+/, '').trim();
      if (cleanSkill) {
        // Split by common separators
        const splitSkills = cleanSkill.split(/[,:;•|]+/).map(s => s.trim()).filter(s => s);
        skills.push(...splitSkills);
      }
    } else {
      // If not a bullet point, may be a colon-separated category and skills list
      if (line.includes(':')) {
        const [category, skillsList] = line.split(':').map(part => part.trim());
        const categorySkills = skillsList.split(/[,;•|]+/).map(s => s.trim()).filter(s => s);
        skills.push(...categorySkills);
      } else {
        // Might be a comma-separated list
        const splitSkills = line.split(/[,:;•|]+/).map(s => s.trim()).filter(s => s);
        skills.push(...splitSkills);
      }
    }
  }
  
  return skills;
}

// Extract date from a line of text
function extractDateFromLine(line) {
  // Look for common date patterns
  const datePatterns = [
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\s*[-–]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/i,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\s*[-–]\s*(Present|Current)\b/i,
    /\b\d{4}\s*[-–]\s*\d{4}\b/,
    /\b\d{4}\s*[-–]\s*(Present|Current)\b/i,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/i
  ];
  
  for (const pattern of datePatterns) {
    const match = line.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return '';
}

// Evaluate relevance of each experience and project for the job
function evaluateRelevance(parsedResume, jobDescription, roleType) {
  const jobKeywords = extractKeywords(jobDescription);
  const jobTechKeywords = extractTechnicalKeywords(jobDescription);
  
  const relevanceScores = {
    experience: [],
    projects: []
  };
  
  // Evaluate each work experience
  parsedResume.experience.forEach((exp, index) => {
    const expText = `${exp.title} ${exp.company} ${exp.responsibilities.join(' ')}`;
    const keywordMatches = countKeywordMatches(expText, jobKeywords);
    const techMatches = countKeywordMatches(expText, jobTechKeywords);
    
    // Calculate relevance score based on keyword matches and role type fit
    const roleTypeFit = calculateRoleTypeFit(expText, roleType);
    const score = (keywordMatches * 2) + (techMatches * 3) + (roleTypeFit * 4);
    
    relevanceScores.experience.push({
      index,
      score,
      keywordMatches,
      techMatches,
      roleTypeFit
    });
  });
  
  // Evaluate each project
  parsedResume.projects.forEach((project, index) => {
    const projectText = `${project.name} ${project.role} ${project.description.join(' ')}`;
    const keywordMatches = countKeywordMatches(projectText, jobKeywords);
    const techMatches = countKeywordMatches(projectText, jobTechKeywords);
    
    // Calculate relevance score based on keyword matches and role type fit
    const roleTypeFit = calculateRoleTypeFit(projectText, roleType);
    const score = (keywordMatches * 2) + (techMatches * 3) + (roleTypeFit * 4);
    
    relevanceScores.projects.push({
      index,
      score,
      keywordMatches,
      techMatches,
      roleTypeFit
    });
  });
  
  // Sort by score in descending order
  relevanceScores.experience.sort((a, b) => b.score - a.score);
  relevanceScores.projects.sort((a, b) => b.score - a.score);
  
  return relevanceScores;
}

// Count how many keywords from the target list appear in the text
function countKeywordMatches(text, keywords) {
  const lowerText = text.toLowerCase();
  let count = 0;
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      count++;
    }
  });
  
  return count;
}

// Calculate how well the text fits the role type
function calculateRoleTypeFit(text, roleType) {
  const lowerText = text.toLowerCase();
  
  // Define role-specific keywords
  const roleKeywords = {
    'frontend': ['frontend', 'front-end', 'ui', 'ux', 'interface', 'design', 'react', 'angular', 'vue', 'javascript', 'css', 'html', 'responsive'],
    'backend': ['backend', 'back-end', 'server', 'database', 'api', 'microservice', 'django', 'flask', 'express', 'node.js', 'ruby'],
    'fullstack': ['fullstack', 'full-stack', 'frontend', 'backend', 'end-to-end'],
    'mobile': ['mobile', 'ios', 'android', 'app', 'swift', 'kotlin', 'react native', 'flutter'],
    'devops': ['devops', 'ci/cd', 'pipeline', 'deployment', 'aws', 'cloud', 'infrastructure', 'kubernetes', 'docker'],
    'data': ['data', 'analysis', 'analytics', 'machine learning', 'ml', 'ai', 'big data', 'statistics'],
    'blockchain': ['blockchain', 'crypto', 'web3', 'ethereum', 'solidity', 'smart contract', 'defi'],
    'product': ['product', 'roadmap', 'user research', 'market', 'strategy', 'stakeholder'],
    'design': ['design', 'ux', 'ui', 'wireframe', 'prototype', 'figma', 'sketch', 'user experience'],
    'general': ['developer', 'engineer', 'software', 'programming', 'technical']
  };
  
  const keywords = roleKeywords[roleType] || roleKeywords['general'];
  return countKeywordMatches(lowerText, keywords) / keywords.length * 10;
}

// Filter and reorder sections based on relevance to job
function filterAndReorderSections(parsedResume, relevanceScores, roleType) {
  const filteredResume = { ...parsedResume };
  
  // Keep only the most relevant experiences (remove very low scoring ones)
  if (filteredResume.experience.length > 0) {
    // Sort experiences by relevance score
    const sortedExperiences = relevanceScores.experience
      .filter(item => item.score > 3) // Only keep reasonably relevant experiences
      .map(item => parsedResume.experience[item.index]);
    
    // Always keep at least the 2 most recent experiences
    const recentExperiences = [...parsedResume.experience].sort((a, b) => {
      // Sort by date descending (assuming date format can be compared)
      if (a.date.includes('Present') || a.date.includes('Current')) return -1;
      if (b.date.includes('Present') || b.date.includes('Current')) return 1;
      return b.date.localeCompare(a.date);
    }).slice(0, 2);
    
    // Combine and deduplicate
    const combinedExperiences = [...sortedExperiences];
    recentExperiences.forEach(exp => {
      if (!combinedExperiences.some(e => e.company === exp.company && e.title === exp.title)) {
        combinedExperiences.push(exp);
      }
    });
    
    filteredResume.experience = combinedExperiences;
  }
  
  // Keep only the most relevant projects
  if (filteredResume.projects.length > 0) {
    // Only keep projects that are relevant for this role type
    // For specialized roles, we'll be more selective
    let minScore = 3; // Default threshold
    
    if (['blockchain', 'mobile', 'data', 'design'].includes(roleType)) {
      minScore = 5; // Higher threshold for specialized roles
    }
    
    // Keep the highest-scoring projects
    filteredResume.projects = relevanceScores.projects
      .filter(item => item.score > minScore)
      .map(item => parsedResume.projects[item.index]);
    
    // Always keep at least 2 projects if available
    if (filteredResume.projects.length < 2 && parsedResume.projects.length >= 2) {
      filteredResume.projects = relevanceScores.projects
        .slice(0, 2)
        .map(item => parsedResume.projects[item.index]);
    }
  }
  
  return filteredResume;
}

// Tailor resume content to better match job description
function tailorResumeContent(resume, jobDescription, jobKeywords, jobTechKeywords) {
  const tailoredResume = { ...resume };
  
  // Enhance summary with job-relevant keywords
  if (tailoredResume.summary) {
    tailoredResume.summary = enhanceSummary(tailoredResume.summary, jobDescription, jobKeywords);
  } else {
    // Generate summary if missing
    tailoredResume.summary = generateSummary(tailoredResume, jobKeywords, jobTechKeywords);
  }
  
  // Rewrite and enhance experience bullet points
  if (tailoredResume.experience && tailoredResume.experience.length > 0) {
    tailoredResume.experience = tailoredResume.experience.map(exp => {
      // Tailor job title if needed
      const tailoredTitle = tailorJobTitle(exp.title, jobDescription);
      
      // Enhance responsibilities to include job-relevant terms
      const tailoredResponsibilities = exp.responsibilities.map(responsibility => 
        enhanceResponsibility(responsibility, jobDescription, jobKeywords, jobTechKeywords)
      );
      
      return {
        ...exp,
        title: tailoredTitle,
        responsibilities: tailoredResponsibilities
      };
    });
  }
  
  // Rewrite and enhance project descriptions
  if (tailoredResume.projects && tailoredResume.projects.length > 0) {
    tailoredResume.projects = tailoredResume.projects.map(project => {
      // Tailor project role if needed
      const tailoredRole = tailorJobTitle(project.role, jobDescription);
      
      // Enhance project descriptions to include job-relevant terms
      const tailoredDescriptions = project.description.map(desc => 
        enhanceResponsibility(desc, jobDescription, jobKeywords, jobTechKeywords)
      );
      
      return {
        ...project,
        role: tailoredRole,
        description: tailoredDescriptions
      };
    });
  }
  
  // Reorder and enhance skills to prioritize job-relevant ones
  if (tailoredResume.skills && tailoredResume.skills.length > 0) {
    const jobRelevantSkills = [];
    const otherSkills = [];
    
    tailoredResume.skills.forEach(skill => {
      // Check if skill is relevant to job
      if (isSkillRelevant(skill, jobDescription, jobKeywords, jobTechKeywords)) {
        jobRelevantSkills.push(skill);
      } else {
        otherSkills.push(skill);
      }
    });
    
    // Add any missing important skills from job description
    const missingSkills = findMissingSkills(jobTechKeywords, [...jobRelevantSkills, ...otherSkills]);
    
    // Combine skills with job-relevant ones first
    tailoredResume.skills = [...jobRelevantSkills, ...missingSkills, ...otherSkills];
  }
  
  return tailoredResume;
}

// Enhance an existing summary with job-relevant keywords
function enhanceSummary(summary, jobDescription, jobKeywords) {
  // Get top 5 job keywords that should be in the summary
  const importantKeywords = jobKeywords.slice(0, 5);
  let enhancedSummary = summary;
  
  // Check which keywords are missing from the summary
  const missingSummaryKeywords = importantKeywords.filter(keyword => 
    !summary.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // If significant keywords are missing, enhance the summary
  if (missingSummaryKeywords.length > 0) {
    // Identify the sentence where we can add keywords naturally
    const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary];
    
    if (sentences.length > 1) {
      // Add keywords to the second sentence if possible
      const targetSentenceIndex = 1;
      let modifiedSentence = sentences[targetSentenceIndex];
      
      // Add missing keywords naturally
      if (modifiedSentence.includes('skills') || modifiedSentence.includes('expertise')) {
        // Replace generic skills mention with specific keywords
        modifiedSentence = modifiedSentence.replace(
          /skills|expertise/i, 
          `expertise in ${missingSummaryKeywords.join(', ')}`
        );
      } else {
        // Append to the end of the sentence
        modifiedSentence = modifiedSentence.replace(
          /[.!?]+$/, 
          `, with strengths in ${missingSummaryKeywords.join(', ')}. `
        );
      }
      
      sentences[targetSentenceIndex] = modifiedSentence;
      enhancedSummary = sentences.join(' ');
    } else {
      // Only one sentence, append to it
      enhancedSummary = enhancedSummary.replace(
        /[.!?]+$/, 
        `. Skilled in ${missingSummaryKeywords.join(', ')}.`
      );
    }
  }
  
  return enhancedSummary;
}

// Generate a summary if one doesn't exist
function generateSummary(resume, jobKeywords, jobTechKeywords) {
  // Handle case where resume experience might be undefined
  const experiences = resume.experience || [];
  
  // Extract experience information
  const titles = experiences.map(exp => exp.title || '');
  const commonTitle = findMostCommonString(titles) || 'Professional';
  
  // Extract technical skills (default to empty array if skills is undefined)
  const resumeSkills = resume.skills || [];
  const techSkills = resumeSkills.filter(skill => 
    jobTechKeywords.some(techKeyword => 
      skill.toLowerCase().includes(techKeyword.toLowerCase())
    )
  );
  
  // Get top skills to highlight
  const topSkills = techSkills.slice(0, 3).join(', ');
  
  // Create basic summary structure
  let summary = `${commonTitle} with a passion for delivering high-quality solutions`;
  
  if (topSkills) {
    summary += ` and expertise in ${topSkills}`;
  }
  
  // Add experience span if available
  if (experiences.length > 0) {
    const yearsOfExperience = estimateYearsOfExperience(experiences);
    if (yearsOfExperience > 0) {
      summary += `. ${yearsOfExperience}+ years of experience`;
    }
  }
  
  // Add key job keywords
  const keyJobTerms = jobKeywords.slice(0, 3).join(', ');
  summary += `. Proven ability to excel in ${keyJobTerms} environments and deliver impactful results.`;
  
  return summary;
}

// Find the most common string in an array
function findMostCommonString(strings) {
  if (!strings || strings.length === 0) return null;
  
  const counts = {};
  let maxCount = 0;
  let mostCommon = null;
  
  for (const str of strings) {
    if (!str) continue; // Skip empty strings
    
    counts[str] = (counts[str] || 0) + 1;
    if (counts[str] > maxCount) {
      maxCount = counts[str];
      mostCommon = str;
    }
  }
  
  return mostCommon;
}

// Estimate years of experience from work history
function estimateYearsOfExperience(experiences) {
  let totalMonths = 0;
  
  experiences.forEach(exp => {
    const dateText = exp.date || '';
    
    // Extract year values using regex
    const yearMatch = dateText.match(/\b(\d{4})\b.*\b(\d{4}|Present|Current)\b/i);
    
    if (yearMatch) {
      const startYear = parseInt(yearMatch[1]);
      const endYear = yearMatch[2].toLowerCase().includes('present') || yearMatch[2].toLowerCase().includes('current')
        ? new Date().getFullYear()
        : parseInt(yearMatch[2]);
      
      // Calculate duration in months (approximate)
      const durationInMonths = (endYear - startYear) * 12;
      totalMonths += durationInMonths;
    }
  });
  
  // Convert months to years and round to nearest whole number
  return Math.round(totalMonths / 12);
}

// Format the optimized resume into a clean text format
function formatOptimizedResume(resume, jobKeywords, jobTechKeywords) {
  let formattedResume = '';
  
  // Add name and contact info
  if (resume.header) {
    formattedResume += `${resume.header}\n\n`;
  }
  
  if (resume.contactInfo) {
    formattedResume += `${resume.contactInfo}\n\n`;
  }
  
  // Add professional summary
  if (resume.summary) {
    formattedResume += `## PROFESSIONAL SUMMARY\n${resume.summary}\n\n`;
  }
  
  // Add skills section with most relevant skills first
  if (resume.skills && resume.skills.length > 0) {
    formattedResume += `## SKILLS\n`;
    
    // Group skills by general categories
    const technicalSkills = resume.skills.filter(skill => 
      jobTechKeywords.some(tech => 
        skill.toLowerCase().includes(tech.toLowerCase()) || 
        tech.toLowerCase().includes(skill.toLowerCase())
      )
    );
    
    const softSkills = resume.skills.filter(skill => 
      !technicalSkills.includes(skill) && 
      ['communication', 'leadership', 'teamwork', 'project management', 'problem solving'].some(
        softSkill => skill.toLowerCase().includes(softSkill.toLowerCase())
      )
    );
    
    const otherSkills = resume.skills.filter(skill => 
      !technicalSkills.includes(skill) && !softSkills.includes(skill)
    );
    
    // Format technical skills
    if (technicalSkills.length > 0) {
      formattedResume += `Technical: ${technicalSkills.join(' • ')}\n`;
    }
    
    // Format soft skills
    if (softSkills.length > 0) {
      formattedResume += `${softSkills.length > 0 && technicalSkills.length > 0 ? 'Soft Skills: ' : ''}${softSkills.join(' • ')}\n`;
    }
    
    // Format other skills
    if (otherSkills.length > 0) {
      formattedResume += `${otherSkills.join(' • ')}\n`;
    }
    
    formattedResume += '\n';
  }
  
  // Add experience section
  if (resume.experience && resume.experience.length > 0) {
    formattedResume += `## EXPERIENCE\n`;
    
    resume.experience.forEach(exp => {
      formattedResume += `${exp.company || ''}, ${exp.title || ''}    ${exp.date || ''}\n`;
      
      if (exp.responsibilities && exp.responsibilities.length > 0) {
        exp.responsibilities.forEach(responsibility => {
          formattedResume += `• ${responsibility}\n`;
        });
      }
      
      formattedResume += '\n';
    });
  }
  
  // Add projects section
  if (resume.projects && resume.projects.length > 0) {
    formattedResume += `## PROJECTS\n`;
    
    resume.projects.forEach(project => {
      formattedResume += `${project.name || ''}, ${project.role || ''}    ${project.date || ''}\n`;
      
      if (project.description && project.description.length > 0) {
        project.description.forEach(desc => {
          formattedResume += `• ${desc}\n`;
        });
      }
      
      formattedResume += '\n';
    });
  }
  
  // Add education section
  if (resume.education && resume.education.length > 0) {
    formattedResume += `## EDUCATION\n`;
    
    resume.education.forEach(edu => {
      formattedResume += `${edu.institution || ''}, ${edu.location || ''}\n`;
      
      if (edu.degree) {
        formattedResume += `• ${edu.degree}\n`;
      }
      
      if (edu.details && edu.details.length > 0) {
        edu.details.forEach(detail => {
          formattedResume += `• ${detail}\n`;
        });
      }
      
      formattedResume += '\n';
    });
  }
  
  // Add any additional sections
  if (resume.additionalSections && resume.additionalSections.length > 0) {
    resume.additionalSections.forEach(section => {
      formattedResume += `## ${section.title}\n${section.content}\n\n`;
    });
  }
  
  return formattedResume;
}
  


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
