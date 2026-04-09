export type PhaseActivity = {
  key: string
  title: string
  details: string
}

export type PhaseDeliverable = {
  key: string
  title: string
  details: string
}

export type StartupPhase = {
  key: string
  index: number
  display_index: string
  industry_id: number | null
  name: string
  short_name: string
  objective: string
  must_have: PhaseActivity[]
  good_to_have: PhaseActivity[]
  deliverables: PhaseDeliverable[]
}

export const STARTUP_PHASES: StartupPhase[] = [
  {
    key: 'phase-0',
    index: 0,
    display_index: '0',
    industry_id: null,
    name: 'Phase 0: Founder Readiness',
    short_name: 'Founder Readiness',
    objective:
      'Assess your personal baseline - money, skills, and network - before you commit to building anything.',
    must_have: [
      {
        key: 'p0_mh_1',
        title: 'Know exactly how many months you can survive without income from this business.',
        details:
          'Take your liquid savings, subtract 3 months of personal emergency buffer, divide by your monthly spend. That number is your real deadline. Most founders overestimate this by 30 to 40%. Be conservative.'
      },
      {
        key: 'p0_mh_2',
        title:
          'Be honest about what you can build yourself and what you will have to pay someone else to do.',
        details:
          'List every skill the business needs in year one. Mark what you own. Every gap is a hire, a partner, or a learning priority. Pretending the gap does not exist is how founders waste their first 6 months.'
      },
      {
        key: 'p0_mh_3',
        title:
          'List the 50 contacts in your network who can actually open doors - customers, investors, or partners.',
        details:
          'Not cheerleaders - people who can make an introduction with one message. Go through your phone, LinkedIn, and WhatsApp. If you cannot name 20 today, building that network is your first real task.'
      },
      {
        key: 'p0_mh_4',
        title: "Define exactly what skills your co-founder needs to have that you don't.",
        details:
          'Two founders with identical strengths build identical blind spots. If you are a product person, you need a sales person. Write the profile before you start looking - otherwise you hire for comfort, not for need.'
      },
      {
        key: 'p0_mh_5',
        title: 'Write down what you will not compromise on before pressure forces the decision.',
        details:
          'Equity splits, working hours, decision authority, salary expectations - these conversations get harder as stakes rise. Document non-negotiables now. Founders who skip this have it later under far worse conditions.'
      },
      {
        key: 'p0_mh_6',
        title: 'Ask yourself honestly - if this goes to zero in two years, can you recover?',
        details:
          'This is not pessimism - it is knowing your real risk tolerance before you are inside the pressure. If the answer is no, plan your safety net before you jump. Founders who have thought this through make better decisions when things get hard.'
      }
    ],
    good_to_have: [
      {
        key: 'p0_gth_1',
        title: 'Go deep into 2 to 3 specific sectors before picking your problem to solve.',
        details:
          "Read industry reports and operator blogs, not just startup news. The best problems are ones insiders call 'annoying but not worth solving themselves.' That gap is where startups win."
      },
      {
        key: 'p0_gth_2',
        title:
          'Reach out to 3 people who have built something in your target space and ask them one specific, researched question.',
        details:
          "Come with a specific question based on something you already researched. 'I noticed you scaled without doing X - was that intentional?' gets a response. 'Can we have a call?' usually does not."
      },
      {
        key: 'p0_gth_3',
        title:
          'Go to the one or two events where your actual target customers gather - not general startup events.',
        details:
          'Skip the generic tech summits. Find the trade conference, the LinkedIn community, the WhatsApp group where your future customers spend time. Being the only founder in a room full of buyers is worth more than any pitch event.'
      },
      {
        key: 'p0_gth_4',
        title:
          'Start writing publicly about the problem you are observing - even before you have the solution.',
        details:
          'You do not need the solution yet. Writing about the problem builds credibility, attracts early users, and sharpens your thinking. Founders who build an audience before they launch have a measurable advantage at traction stage.'
      },
      {
        key: 'p0_gth_5',
        title:
          'Spend one full day watching your target customer do their actual work - not talking about it.',
        details:
          'Ask to sit with them for a day - in their office or on a screen share. You will spot 3 to 4 problems they never mentioned in any interview. What people say they do and what they actually do are almost never the same thing.'
      },
      {
        key: 'p0_gth_6',
        title: 'Find 3 to 5 startups in your space that failed and understand exactly why.',
        details:
          'Post-mortems on failed startups are publicly available on blogs and founder forums. The patterns repeat - wrong customer, too early, co-founder breakdown, wrong pricing. Learning from their mistakes costs you nothing.'
      }
    ],
    deliverables: [
      {
        key: 'p0_d_1',
        title: 'Personal Runway Calculator',
        details:
          'A simple spreadsheet: liquid savings minus emergency buffer divided by monthly spend. Update it every month. This is your real operational deadline.'
      },
      {
        key: 'p0_d_2',
        title: 'Founder DNA Profile',
        details:
          'A one-page document covering your working style, strengths, non-negotiables, and risk tolerance. Used to match with compatible co-founders and identify where you need support.'
      },
      {
        key: 'p0_d_3',
        title: 'Skills Gap Matrix',
        details:
          'A table listing every critical function the business needs and who covers it today. Every empty cell is a hiring or partnership priority.'
      },
      {
        key: 'p0_d_4',
        title: 'Ideal Co-founder Persona',
        details:
          'A written profile of the specific skills, experience, and temperament your ideal co-founder has. Specific enough that you would recognise them in a room.'
      }
    ]
  },
  {
    key: 'phase-1',
    index: 1,
    display_index: '1',
    industry_id: null,
    name: 'Phase 1: Idea Validation',
    short_name: 'Idea Validation',
    objective:
      'Prove that a painful, specific problem exists - and that real people will pay to solve it - before you build a single thing.',
    must_have: [
      {
        key: 'p1_mh_1',
        title:
          'Have 30 or more honest conversations with people who have the problem - not people who know you.',
        details:
          "Do not pitch. Ask 'Tell me about the last time you tried to solve this.' Past behaviour predicts buying behaviour. If they cannot recall struggling with it, the problem is not painful enough. Patterns only appear at volume - 30 conversations minimum."
      },
      {
        key: 'p1_mh_2',
        title:
          'Document exactly how your target customer solves this problem today - every step, every workaround.',
        details:
          'Draw the workflow they use right now - the spreadsheet, the WhatsApp group, the manual workaround. That workflow is your real competition. The gap between their current pain and a better solution is where your product lives.'
      },
      {
        key: 'p1_mh_3',
        title:
          'Analyse your top 5 competitors - their pricing, their 1-star reviews, and the specific gaps customers complain about.',
        details:
          'Go through their 1-star reviews on G2, App Store, or Google. That is a direct list of what their customers hate. Your product does not need to beat everything - it needs to do the one critical thing they do badly, significantly better.'
      },
      {
        key: 'p1_mh_4',
        title: 'Work out how big this market actually is using real numbers - not broad industry reports.',
        details:
          'Count the number of specific customers who have this problem and multiply by what they would pay annually. Broad industry reports feel good and mean nothing. Bottom-up math gives you a number you can defend to an investor.'
      },
      {
        key: 'p1_mh_5',
        title: 'Build a specific profile of the one person most likely to pay you first.',
        details:
          "Small business owners' is not a customer profile. 'A retail store owner in Tier 2 cities with 3 to 5 staff, managing inventory manually, losing 2 hours daily to errors' - that is a profile you can find and sell to."
      },
      {
        key: 'p1_mh_6',
        title: 'Write your core hypothesis in one sentence - who, what, and why they will pay.',
        details:
          "Format it as: 'If we build X for Y customer, they will do Z because of this specific reason.' This is your north star for the next 90 days. If you cannot write it in one sentence, you are not clear enough yet."
      }
    ],
    good_to_have: [
      {
        key: 'p1_gth_1',
        title:
          'Build a simple landing page and spend ₹5,000 to ₹10,000 driving traffic to it - measure who signs up.',
        details:
          'A basic page describing the problem and your solution with a signup form tells you more than 100 conversations. If people who do not know you personally sign up from an ad, that is a real signal. If nobody does, the message is wrong - not necessarily the idea.'
      },
      {
        key: 'p1_gth_2',
        title:
          'Get 3 to 5 potential B2B customers to sign a non-binding letter of intent before you build anything.',
        details:
          'An LOI is a written statement from a potential customer saying they would seriously evaluate your product when ready. It is not a purchase order - but it is a commitment that costs them something, which makes it a real signal. One LOI is worth 50 encouraging conversations.'
      },
      {
        key: 'p1_gth_3',
        title: 'Build a waitlist - but force every signup to answer one qualifying question.',
        details:
          "What are you currently using to solve this?' tells you more about your market than any demographic question. Filter your waitlist by answers - the people with the most painful current situation are your first target customers."
      },
      {
        key: 'p1_gth_4',
        title: 'Check whether people are actively searching online for a solution to this problem.',
        details:
          'Use Google Keyword Planner or Ahrefs. If 10,000 people a month are searching for a solution, demand exists and is findable. If nobody searches, either the problem is not painful enough or people do not know a solution is possible - both matter for GTM.'
      },
      {
        key: 'p1_gth_5',
        title: 'Define why this problem can be solved now when it could not be solved 3 years ago.',
        details:
          "Investors always ask 'why now?' - and it is a good question even if you never raise. What changed - regulation, technology, consumer behaviour, infrastructure - that makes your solution possible or necessary today? If you cannot answer this, your timing thesis is weak."
      },
      {
        key: 'p1_gth_6',
        title: 'Sell a manual version of your solution to 3 paying customers before writing a single line of code.',
        details:
          'Do it completely by hand. Charge a real price. If people pay for the manual version, they will pay for the automated one. Airbnb photographed listings manually. Zapier used copy-paste before building automation. Payment beats proof of concept every time.'
      }
    ],
    deliverables: [
      {
        key: 'p1_d_1',
        title: 'Validation Scorecard',
        details:
          'A tracker showing how many of your 30 conversations confirmed the problem, showed willingness to pay, and matched your ICP. The score tells you whether to proceed, refine, or stop.'
      },
      {
        key: 'p1_d_2',
        title: 'Lean Canvas',
        details:
          'A single-page business model covering problem, customer segment, value proposition, channels, revenue streams, and cost structure. Update it every time an assumption changes.'
      },
      {
        key: 'p1_d_3',
        title: 'Competitor Tracker',
        details:
          'A table of your top 5 competitors with pricing, key features, and the specific gaps customers complain about. Updated monthly as you learn more.'
      },
      {
        key: 'p1_d_4',
        title: 'Ideal Customer Profile (ICP)',
        details:
          'A one-page profile of the exact person who will pay you first - their role, company size, daily frustration, current workaround, and the trigger that makes them switch.'
      }
    ]
  },
  {
    key: 'phase-2',
    index: 2,
    display_index: '2',
    industry_id: null,
    name: 'Phase 2: MVP Development',
    short_name: 'MVP Development',
    objective:
      'Build the smallest working version of your solution in the shortest possible time then put it in front of real users before you are ready.',
    must_have: [
      {
        key: 'p2_mh_1',
        title: 'Define the single core action your product must enable cut everything else from version 1.',
        details:
          "Use the MoSCoW method. Write every feature on a list, then ask 'can we launch without this?' If yes, remove it from version Most founders launch with 3x more features than needed and 3x less learning than they could have had."
      },
      {
        key: 'p2_mh_2',
        title: 'Set a hard 4 to 8 week launch deadline and treat it as non-negotiable.',
        details:
          "Parkinson's Law is real work expands to fill whatever time you give it. Set the date, work backwards, and cut features to meet the deadline. Do not move the deadline to fit the features."
      },
      {
        key: 'p2_mh_3',
        title:
          'Choose how you will build code, no-code, or manual based on what is fastest, not what looks most impressive.',
        details:
          'Bubble, Webflow, and Glide can get a working product live in weeks. A manual service delivered over WhatsApp counts as an MVP. Scalability is a Phase 5 problem. Getting in front of users is a Phase 2 problem.'
      },
      {
        key: 'p2_mh_4',
        title: 'Release your first version to real users even if it embarrasses you.',
        details:
          'If you are not embarrassed by the first version of your product, you launched too late. The goal is a learning loop, not a polished product. Ship, watch what happens, fix what breaks. Every week of delay is a week of learning you did not get.'
      },
      {
        key: 'p2_mh_5',
        title: 'Track what users actually do inside your product not what they say they will do.',
        details:
          'Install PostHog, Mixpanel, or Google Analytics on day one. Track logins, core actions, and where users stop. The drop-off points are your real product roadmap. Opinions tell you what users think. Data tells you what they do.'
      },
      {
        key: 'p2_mh_6',
        title: 'Make sure users can sign up and pay without hitting a single broken step.',
        details:
          'Everything else can be rough but if signup breaks or payment fails, you will never know if the product works because users leave before they experience it. Test both flows yourself, then watch 3 people who have never seen the product do it.'
      }
    ],
    good_to_have: [
      {
        key: 'p2_gth_1',
        title:
          'Watch real users interact with your product without helping them note every moment of hesitation.',
        details:
          'Set up Hotjar or Microsoft Clarity and watch session recordings. A 30-second hesitation on a button label is worth more than a week of internal design debate. Fix what you see, not what you assume.'
      },
      {
        key: 'p2_gth_2',
        title: 'Ship one improvement every week based on what users complained about the previous week.',
        details:
          'Monday: review feedback. Tuesday: decide what to fix. Wednesday and Thursday: fix it. Friday: ship it. This cycle builds trust with early users and keeps you close to the customer. Founders who break this rhythm lose the product-market fit signal.'
      },
      {
        key: 'p2_gth_3',
        title: 'Create a private group for your first 20 to 50 users to report issues and share feedback.',
        details:
          'A WhatsApp group or Slack channel with your beta users is your fastest feedback loop. When a user reports a bug at 9pm and you fix it by morning, that user becomes an advocate. Early users who feel heard become your first referral engine.'
      },
      {
        key: 'p2_gth_4',
        title: 'Log every feature request but do not build anything until 10 or more people ask for the same thing.',
        details:
          'One user asking for a feature is an opinion. Ten users asking for the same thing is a pattern. Keep a simple log feature, who asked, date. When a feature hits 10 requests, it earns its place in the roadmap. This stops you building for the loudest voice in the room.'
      },
      {
        key: 'p2_gth_5',
        title: 'Set up basic data security from day one do not leave this for later.',
        details:
          'Use Auth0 or Firebase for authentication. Ensure HTTPS is live on every page. Basic security takes one day to implement and one breach to lose the trust you spent months building. Do not leave this until you have users to lose.'
      },
      {
        key: 'p2_gth_6',
        title: 'Put up a simple changelog so users can see you are actively building and listening.',
        details:
          'A public page showing your last 5 updates even small ones tells users the product is alive and the team is listening. Visible progress is a retention tool that most founders never use.'
      }
    ],
    deliverables: [
      {
        key: 'p2_d_1',
        title: 'MVP Feature Spec (MoSCoW)',
        details:
          'Your strict, living list of what is in version 1 and what is deliberately excluded. Every team member and vendor works from this document. No feature additions without updating it first.'
      },
      {
        key: 'p2_d_2',
        title: 'Live Beta App or Prototype',
        details:
          'The actual working link to your product not a Figma prototype. Users must be able to interact with it and get real value. This is what the SCORE engine verifies.'
      },
      {
        key: 'p2_d_3',
        title: 'Core Analytics Dashboard',
        details:
          'A live view of daily active users, core action completion rate, and the points where users drop off. Reviewed every Monday morning without exception.'
      },
      {
        key: 'p2_d_4',
        title: 'Beta Feedback Log',
        details:
          'A running document of direct quotes, bug reports, and feature requests from your first 20 to 50 users. Organised by theme, not by date. This becomes your product roadmap.'
      }
    ]
  },
  {
    key: 'phase-3',
    index: 3,
    display_index: '3',
    industry_id: null,
    name: 'Phase 3: Product-Market Fit',
    short_name: 'Product-Market Fit',
    objective:
      'Prove that users come back, your unit economics work, and growth is happening because the product is good not because you are pushing hard.',
    must_have: [
      {
        key: 'p3_mh_1',
        title: 'Track how many users are still active 30 days and 90 days after they first signed up.',
        details:
          'If less than 20% of users return after 30 days, you have a leaky bucket. Pouring new users into a retention problem is the most common and expensive mistake at this stage. Fix retention before you fix growth.'
      },
      {
        key: 'p3_mh_2',
        title: 'Find out what percentage of new users actually experience the core value of your product.',
        details:
          'This is your activation rate the percentage of signups who complete the action that delivers real value. If 1,000 people sign up and only 100 experience the core feature, you have an onboarding problem, not a product problem.'
      },
      {
        key: 'p3_mh_3',
        title: 'Remove every unnecessary step between signup and the moment a user gets real value.',
        details:
          'Map every click and decision a new user faces before they get value. Every unnecessary step costs you users. Dropbox went from 18 steps to Find what works for your product and optimise relentlessly until it feels obvious.'
      },
      {
        key: 'p3_mh_4',
        title: 'Confirm that each paying customer brings you more revenue over their lifetime than it cost to acquire them.',
        details:
          'Target LTV at least 3 times your CAC. If it costs ₹1,000 to acquire a customer and they only ever pay ₹800 total, the business model does not work at scale. Calculate this with real numbers from real customers not projections.'
      },
      {
        key: 'p3_mh_5',
        title: 'Grow your active user base by 5 to 10% every month for at least 3 consecutive months.',
        details:
          'Consistent month-on-month growth matters more than a single spike from a viral post. A spike tells you nothing about your model. 8% MoM for 3 months tells you the product is working and the channel is repeatable. That compounds to 2.5x growth in a year.'
      },
      {
        key: 'p3_mh_6',
        title: 'Find your top 5% of users and understand exactly what they do differently from everyone else.',
        details:
          'These are your super users they log in most often, use the most features, and refer others. Study what they have in common. They are showing you what your product is actually for. Build for them and market to people who look like them.'
      }
    ],
    good_to_have: [
      {
        key: 'p3_gth_1',
        title: 'Run the Sean Ellis test ask users how disappointed they would be if your product disappeared tomorrow.',
        details:
          "If more than 40% say 'very disappointed,' you have product-market fit. Below 40%, keep iterating. This test was used by Dropbox, Superhuman, and Slack before scaling. Keep the survey to 3 questions maximum more than that and response rates drop sharply."
      },
      {
        key: 'p3_gth_2',
        title: 'Give users a strong reason to invite one colleague or friend and track whether they actually do.',
        details:
          'A referral loop only works if the incentive is strong enough and the sharing is frictionless. Cash discount, premium feature unlock, or public recognition test all three. Measure referral conversion rate, not just the number of invites sent.'
      },
      {
        key: 'p3_gth_3',
        title: 'Call 5 users who cancelled or went quiet and pay them for 15 minutes of honest feedback.',
        details:
          "Cancelled users will tell you the truth in a way that active users never will. Offer ₹500 or a gift card for 15 minutes. Ask one question 'What would have had to be true for you to stay?' Their answer is your product roadmap."
      },
      {
        key: 'p3_gth_4',
        title: 'Test a 15 to 20% price increase on new signups and measure whether conversion actually drops.',
        details:
          'Most early-stage founders are underpriced out of fear. If you raise the price 20% and conversion drops by less than 20%, your revenue goes up. If it drops more, you have found the ceiling. Either way you have learned something a survey cannot tell you.'
      },
      {
        key: 'p3_gth_5',
        title: 'Compare users who signed up in month 1 versus month 3 are you getting better at keeping them?',
        details:
          'This is cohort analysis. If month 3 cohort retains better than month 1, your product and onboarding are improving. If retention is flat or worsening despite changes, the problem is the core product not the wrapper around it. Run this monthly.'
      },
      {
        key: 'p3_gth_6',
        title: 'Create a space where your best users can talk to each other and get out of their way.',
        details:
          'A Slack community or WhatsApp group gives super users a reason to stay connected even on days they do not use the product. User-led communities generate organic content, surface real use cases, and create switching costs no feature can replicate.'
      }
    ],
    deliverables: [
      {
        key: 'p3_d_1',
        title: 'Cohort Retention Dashboard',
        details:
          'A visual chart showing what percentage of each monthly cohort is still active at 30, 60, and 90 days. If the curves flatten rather than dropping to zero, you have real retention.'
      },
      {
        key: 'p3_d_2',
        title: 'Unit Economics Tracker',
        details:
          'A live calculation of CAC, LTV, and payback period updated every month with real transaction data. The LTV to CAC ratio is the single most important number at this stage.'
      },
      {
        key: 'p3_d_3',
        title: 'Growth Metrics Dashboard',
        details:
          'Month-on-month tracking of active users and MRR. Reviewed every Monday. If the number is not growing, nothing else matters until you understand why.'
      },
      {
        key: 'p3_d_4',
        title: 'PMF Survey Results',
        details:
          'Results from the Sean Ellis test plus NPS scores from your active user base. These two numbers together tell you where you stand on PMF more accurately than any other measurement.'
      }
    ]
  },
  {
    key: 'phase-3-5',
    index: 4,
    display_index: '3.5',
    industry_id: null,
    name: 'Phase 3.5: Pivot Evaluation',
    short_name: 'Pivot Evaluation',
    objective:
      'Decide clearly using data, not hope - whether to adjust what you are building, change direction entirely, or hold the course.',
    must_have: [
      {
        key: 'p35_mh_1',
        title: 'Use the 5 Whys to find the real reason growth has stopped not the surface reason.',
        details:
          "Ask why five times in sequence. 'Users are not returning' → Why? → 'They don't complete the core action' → Why? → 'The onboarding is confusing' → Why? Most founders stop at the first why and fix the symptom. The 5th why usually reveals the real problem."
      },
      {
        key: 'p35_mh_2',
        title: 'Write your pivot hypothesis in one clear sentence what you are changing and what you expect to happen.',
        details:
          "Format it as: 'By changing X to Y, we expect Z metric to improve within 30 days.' Vague pivots produce vague results. If you cannot write it in one sentence, you are not clear enough on what you are actually testing."
      },
      {
        key: 'p35_mh_3',
        title: 'Define the one number that will tell you the pivot is working within 30 days.',
        details:
          'Pick one metric retention rate, conversion rate, revenue per user whatever proves the core problem is solved. Without this number agreed upfront, founders keep pivoting indefinitely on hope rather than evidence.'
      },
      {
        key: 'p35_mh_4',
        title: 'Check your runway a pivot needs at least 6 months of cash to survive the transition cleanly.',
        details:
          'A pivot resets your timeline. You will lose some users, rebuild parts of the product, and re-learn your customer. If you have less than 6 months of runway, consider a partial pivot changing one element at a time rather than everything at once.'
      },
      {
        key: 'p35_mh_5',
        title: 'Get every co-founder and key investor aligned on the new direction before you move in writing.',
        details:
          'A pivot without team alignment creates two companies inside one. Have the conversation, document the decision, and get agreement from everyone with a stake in the outcome before a single line of code is changed or a single customer is told.'
      },
      {
        key: 'p35_mh_6',
        title: 'Audit everything you have built what can be kept, what must be rebuilt, and what should be discarded.',
        details:
          'Not just code your customer relationships, brand positioning, vendor agreements, and team expertise. A pivot does not always mean starting from zero. Identify the assets that survive the change and build the new direction on top of them.'
      }
    ],
    good_to_have: [
      {
        key: 'p35_gth_1',
        title: 'Study how successful companies in your space pivoted and what specifically triggered the decision.',
        details:
          'Slack started as a gaming company. Instagram was a check-in app called Burbn. In each case the pivot came from observing what users were actually doing not what founders planned. Read the original pivot announcements, not the cleaned-up retrospective versions.'
      },
      {
        key: 'p35_gth_2',
        title: 'Map who your new competitors are in the post-pivot direction before you commit resources.',
        details:
          'A pivot often moves you into a market you were not in before. Spend one week mapping the incumbents, their pricing, and their weak spots. Entering a new market blind is as dangerous as staying in a broken one.'
      },
      {
        key: 'p35_gth_3',
        title: 'Go back to the users who churned and ask if the new direction solves what drove them away.',
        details:
          'These are the people who gave your original product a real chance and walked away. If your pivot addresses what they told you was broken, they are your first test group. If they still would not use the new version, that is important data before you rebuild.'
      },
      {
        key: 'p35_gth_4',
        title: 'Sell the new concept manually to 3 people before rebuilding anything.',
        details:
          'Before spending a day on development, describe the new version to a potential customer and ask if they would pay for it today manually, as a service, as a consultation. If you can get one paying customer without building it, the pivot direction is valid.'
      },
      {
        key: 'p35_gth_5',
        title: 'Update your website and messaging to reflect the new direction as soon as the decision is made.',
        details:
          'Your old messaging will confuse new visitors and send the wrong signal to existing users. Update the homepage, tagline, and product description within the first week of the pivot decision. Clarity costs nothing. Confusion costs customers.'
      },
      {
        key: 'p35_gth_6',
        title: 'Write down the exact number that will tell you the pivot has failed and commit to it before you start.',
        details:
          'Every pivot needs a kill criteria the specific metric below which you stop and reassess. Without it, founders bleed runway on hope. Set the number before the emotion of the pivot takes over. Then honour it when the time comes.'
      }
    ],
    deliverables: [
      {
        key: 'p35_d_1',
        title: 'Root Cause Matrix',
        details:
          'A structured document showing what broke in the original model, why it broke, and what the pivot changes about each broken element. This prevents you from repeating the same mistake in a new direction.'
      },
      {
        key: 'p35_d_2',
        title: 'Pivot Hypothesis and Timeline',
        details:
          'Your one-sentence hypothesis, the 30-day sprint plan to test it, and the technical or operational changes required. Shared with every co-founder and key team member before execution begins.'
      },
      {
        key: 'p35_d_3',
        title: 'Revised Financial Forecast',
        details:
          'Updated cash flow projections accounting for revenue you will lose during the pivot, the cost of rebuilding, and the new timeline to break-even. If the numbers do not work on paper, they will not work in practice.'
      },
      {
        key: 'p35_d_4',
        title: 'Pivot Kill Switch Metrics',
        details:
          'The specific numbers with deadlines that will tell you the pivot has failed. Documented and agreed before the pivot starts. This is the document that prevents founders from staying in a failing direction because of sunk cost.'
      }
    ]
  },
  {
    key: 'phase-4',
    index: 5,
    display_index: '4',
    industry_id: null,
    name: 'Phase 4: Go-To-Market & Growth',
    short_name: 'Go-To-Market & Growth',
    objective:
      'Get paying customers consistently, understand what it costs to acquire them, and build the systems and data that investors need to see.',
    must_have: [
      {
        key: 'p4_mh_1',
        title: 'Define your pricing model structure, price point, and the reasoning behind both.',
        details:
          'Price too low and you attract the wrong customers and make unit economics impossible to fix later. Price too high without sufficient trust and you lose people who would have paid a fair number. Look at willingness to pay signals from Phase 1 and what alternatives charge. Pick a number you can defend.'
      },
      {
        key: 'p4_mh_2',
        title: 'Set up your payment infrastructure before you close your first customer.',
        details:
          'Set up Razorpay, Cashfree, or equivalent and test it before you close your first customer. Set up a basic invoicing process so every transaction produces a document. Ensure your bank account is in the company name. This takes 2 to 3 days. Do it before you need it.'
      },
      {
        key: 'p4_mh_3',
        title: 'Pick one or two acquisition channels and commit fully do not spread across five at once.',
        details:
          'Outbound email, LinkedIn, WhatsApp communities, SEO, paid ads pick the one or two where your customer actually spends time and master them for 6 weeks before drawing conclusions. Founders who try 5 channels at once are mediocre at all of them and cannot identify what is working.'
      },
      {
        key: 'p4_mh_4',
        title: 'Track every stage of your funnel from first contact to paying customer.',
        details:
          'Track Awareness → Interest → Signup → Payment. Measure conversion rate at each step. If 1,000 people see your ad, 100 click, 20 sign up, and 2 pay your payment conversion is the problem, not your ad. Fixing the wrong stage is how founders waste their marketing budget.'
      },
      {
        key: 'p4_mh_5',
        title: 'Find one person or platform that already has your customers and make them want to work with you.',
        details:
          "A distribution partner who already has your audience's trust can deliver more customers in one month than 6 months of organic effort. Bring them something genuinely valuable a revenue share, a co-branded product, or exclusive access. The best partnerships feel fair to both sides immediately."
      },
      {
        key: 'p4_mh_6',
        title: 'Document exactly how you close a customer every step, every message, every objection handled.',
        details:
          'Write down the exact email sequence, the demo script, and the 3 most common objections with responses that work. This document is what your first sales hire will use to replicate your results. If it only exists in your head, it dies when you hand over sales.'
      },
      {
        key: 'p4_mh_7',
        title: 'Confirm that paying customers are returning not just paying once and disappearing.',
        details:
          'Free users returning is encouraging. Paying customers returning is validation. Track whether customers who paid you once come back, renew, or refer someone within 60 days. Someone who paid and came back is telling you the product delivered on its promise.'
      },
      {
        key: 'p4_mh_8',
        title: 'Build a data room with your financials, cap table, and key metrics clean and ready for investor review.',
        details:
          'Cap table with all equity, vesting, and notes. 12 months of financial statements. Key metrics MRR, CAC, LTV, churn. Founders who have this ready close faster because they spend due diligence time discussing the business, not hunting for documents.'
      },
      {
        key: 'p4_mh_9',
        title: 'Make sure your cap table is clean no unresolved agreements, no handshake deals, no ambiguous equity.',
        details:
          'Every share, every option, every convertible note must be formally documented. Investors check this in the first 30 minutes of due diligence. One unresolved equity dispute can kill a funding round that took 6 months to build. Fix it now, not under term sheet pressure.'
      }
    ],
    good_to_have: [
      {
        key: 'p4_gth_1',
        title: 'Set up retargeting ads for everyone who visited your website but did not sign up.',
        details:
          'Someone who visited your pricing page and left is 3 to 5 times more likely to convert than a cold prospect. A ₹5,000 monthly retargeting budget on Meta or Google targeting your own website visitors can deliver a lower CAC than almost any other paid channel.'
      },
      {
        key: 'p4_gth_2',
        title: 'Use early pricing incentives deliberately founder pricing, early-access discounts, or limited-time offers.',
        details:
          "First 20 customers get 30% off as founding members' is a conversion tool with a clear expiry. Permanent discounting out of fear is a habit that damages the business. If you use early incentives, document who got what and have a plan for transitioning them to standard pricing."
      },
      {
        key: 'p4_gth_3',
        title: 'Experiment with pricing one change at a time once you have 20 or more paying customers.',
        details:
          'Raise the price for new customers and measure whether conversion drops. Bundle two things and see if average order value goes up. The rule is simple change one thing, measure the result, decide. Changing two things at once means you will never know what caused the shift.'
      },
      {
        key: 'p4_gth_4',
        title: 'Build one detailed case study showing a real customer result with specific numbers.',
        details:
          "How Company X made ₹5 lakhs using our tool in 90 days' closes deals faster than any feature list. Get permission, use real numbers, and write it from the customer's perspective not yours. One strong case study shared in the right places outperforms 3 months of content marketing."
      },
      {
        key: 'p4_gth_5',
        title: 'Pitch one data-driven story to 3 to 5 industry newsletters or communities in your space.',
        details:
          "Do not send a generic press release. Find a genuinely interesting insight from your user data and offer it as a story. 'We surveyed 500 founders and found that 70% lose more than 10 hours a week to this problem' gets published. A product announcement does not."
      },
      {
        key: 'p4_gth_6',
        title: 'Give industry influencers or community leaders a meaningful revenue share for qualified referrals.',
        details:
          'A 20 to 30% recurring commission on every customer referred is expensive per customer and cheap per channel. One active affiliate who genuinely believes in your product can bring 10 to 20 qualified leads a month at zero upfront cost.'
      },
      {
        key: 'p4_gth_7',
        title: 'Build an email list you own do not rely entirely on social media followers.',
        details:
          'Social media reach is rented. An email list is an asset you own. A founder with 500 engaged email subscribers has more real reach than a brand with 10,000 Instagram followers at 2% engagement. Start building from day one, even if you send one email a month.'
      }
    ],
    deliverables: [
      {
        key: 'p4_d_1',
        title: 'Pricing Document',
        details:
          'States your price, the structure (one-time, subscription, per transaction, retainer), and the reasoning behind the number. Updated every time the price changes and why.'
      },
      {
        key: 'p4_d_2',
        title: 'Payment Infrastructure Confirmation',
        details:
          'Payment gateway live and tested, invoice template ready, and company bank account confirmed with one successful test transaction documented before your first customer closes.'
      },
      {
        key: 'p4_d_3',
        title: 'Customer Acquisition Log',
        details:
          'Every customer with their source, date of acquisition, and current status. This tells you which channel is actually working. Without it, you are making channel decisions based on gut feel.'
      },
      {
        key: 'p4_d_4',
        title: 'Payment Proof from First Paying Customers',
        details:
          'Payment confirmation from a minimum of 5 paying customers invoice, payment confirmation, or bank statement entry. The moment money from a non-related customer hits your account, validation is real.'
      },
      {
        key: 'p4_d_5',
        title: 'CAC Calculation Sheet',
        details:
          'Every cost you spent to acquire your first paying customers divided by the number of customers. Compared to first-year revenue per customer. If CAC is higher than revenue, you have an economics problem to fix immediately.'
      },
      {
        key: 'p4_d_6',
        title: 'Paying Customer Retention Data',
        details:
          'What percentage of first-time paying customers returned or renewed within 60 days. With documented reasons for those who did not. This is the most honest signal of whether the product delivered what you promised.'
      },
      {
        key: 'p4_d_7',
        title: 'Seed-Stage Data Room',
        details:
          'A secure shared folder with incorporation documents, cap table, 12 months of financials, product metrics, and team structure. Organised so an investor can find any document in under 2 minutes.'
      },
      {
        key: 'p4_d_8',
        title: 'Sales Playbook and Scripts',
        details:
          'The exact email templates, demo structure, objection responses, and follow-up cadence that closes deals. Written clearly enough that someone you hire next month can use it on day one without asking you a single question.'
      }
    ]
  },
  {
    key: 'phase-5',
    index: 6,
    display_index: '5',
    industry_id: null,
    name: 'Phase 5: Scaling Operations',
    short_name: 'Scaling Operations',
    objective:
      'Replace founder hustle with documented processes, a capable team, and financial discipline so the business grows without you in every decision.',
    must_have: [
      {
        key: 'p5_mh_1',
        title:
          'Hire your first specialist in the function most directly blocking revenue or delivery and stop doing their job yourself.',
        details:
          'You have validated that the business works. Now remove yourself from daily execution so you can focus on growth. Define the role clearly before recruiting a vague job description attracts the wrong people and wastes 3 months of your time.'
      },
      {
        key: 'p5_mh_2',
        title: 'Move customer data and support off spreadsheets and into a proper CRM and helpdesk tool.',
        details:
          'HubSpot, Zoho, or Freshsales for CRM. Freshdesk or Intercom for support. At 100+ customers, spreadsheets create missed follow-ups, lost context, and support failures. The migration takes one week and saves hours every month from that point forward.'
      },
      {
        key: 'p5_mh_3',
        title: 'Produce a monthly Profit and Loss statement and review it every month without exception.',
        details:
          'Move to accrual accounting if you have not already. Your P&L should show revenue, cost of goods or services, gross margin, operating expenses, and net profit by month. If it takes more than one day to produce this, your finance process needs fixing before you scale.'
      },
      {
        key: 'p5_mh_4',
        title: "Set quarterly OKRs for every team and make sure they connect directly to the company's revenue goal.",
        details:
          "OKRs work when every team's objectives can be traced back to the same company-level outcome. If the product team's OKR and the sales team's OKR do not reinforce each other, you are building internal misalignment at scale. Review progress weekly not just at quarter end."
      },
      {
        key: 'p5_mh_5',
        title: 'Automate the 3 to 5 manual tasks your team does every day that do not require human judgement.',
        details:
          'Billing reminders, lead assignments, support ticket routing, onboarding emails these should not require a human to trigger them. Use Zapier, Make, or native product automation. Every hour saved on repetitive tasks is an hour redirected to work that actually requires thinking.'
      },
      {
        key: 'p5_mh_6',
        title: 'Identify your highest-value customers who pays the most, stays the longest, and refers others.',
        details:
          'Go through your customer list and find who pays the most, stays the longest, and refers others most often. Understand what they have in common their industry, size, how they found you, what they use most. This profile becomes the targeting brief for your next 100 customers.'
      },
      {
        key: 'p5_mh_7',
        title: 'Make sure your servers and infrastructure can handle 10 times your current load without breaking.',
        details:
          'Move off the lowest-tier hosting plan. Set up daily database backups. Load test your product at 10x current traffic before running any growth campaign. Discovering your infrastructure cannot scale during a successful campaign is the worst possible timing.'
      }
    ],
    good_to_have: [
      {
        key: 'p5_gth_1',
        title: 'Write a clear onboarding document for every new hire so they are productive in their first week without asking you.',
        details:
          'Cover the company mission, their specific role, the tools they will use, and their 30-60-90 day targets. If a new hire needs to interrupt the team every day in their first week, the onboarding process is the problem not the hire.'
      },
      {
        key: 'p5_gth_2',
        title: 'Document every core company process in one central place so the business survives if a key person leaves.',
        details:
          "Notion, Confluence, or a well-organised shared drive works. The test is simple if your best operator left tomorrow, could someone else run their function within a week using only what is documented? If no, knowledge is trapped in one person's head."
      },
      {
        key: 'p5_gth_3',
        title: 'Start the SOC 2 compliance process if you are selling to enterprise customers.',
        details:
          'Enterprise procurement teams will not approve a vendor without SOC The process takes 3 to 6 months and costs ₹10 to ₹25 lakhs with a qualified auditor. Start before a customer asks for it not after you are losing the deal while waiting for the certificate.'
      },
      {
        key: 'p5_gth_4',
        title: 'Set up an ESOP pool to retain your best early employees as the company grows.',
        details:
          'A 10 to 15% ESOP pool is standard at this stage. Employees with equity think like owners. Employees without it think like employees. Four-year vesting with a one-year cliff is the most common and founder-friendly structure. Formalise this before you start losing people to better-paying competitors.'
      },
      {
        key: 'p5_gth_5',
        title: 'Call your top 3 to 5 vendors and renegotiate pricing you have volume now and leverage you did not have before.',
        details:
          'AWS, Stripe, your SMS provider, your SaaS tools all have negotiated pricing for customers at your volume. The conversation takes 30 minutes and can save ₹5 to ₹20 lakhs annually. Most founders never make this call because they assume the published price is the final price.'
      },
      {
        key: 'p5_gth_6',
        title: 'Build a customer success function shift from fixing problems to helping customers achieve results.',
        details:
          'Customer success is not support. Support fixes what is broken. Customer success proactively helps customers get more value from your product. Even one person focused on your top 20% of customers will measurably reduce churn and increase expansion revenue within 90 days.'
      }
    ],
    deliverables: [
      {
        key: 'p5_d_1',
        title: 'Scalable Org Chart',
        details:
          'Current team structure with clearly defined roles and the next 5 strategic hires planned with timelines. Every position should have a reason for existing tied to a specific business outcome.'
      },
      {
        key: 'p5_d_2',
        title: 'Monthly P&L and Balance Sheet',
        details:
          "Clean, investor-ready financial statements produced within 5 working days of each month's end. If it takes longer than that, your accounting process needs restructuring before you scale further."
      },
      {
        key: 'p5_d_3',
        title: 'High-Value Customer Profile',
        details:
          'Your top 20% of customers identified by revenue and retention, with their common attributes documented. This profile becomes the targeting brief for your next acquisition push and sharpens the ICP from Phase 1.'
      },
      {
        key: 'p5_d_4',
        title: 'Company OKR Tracker',
        details:
          "A shared dashboard showing every team's quarterly objectives and current progress. Updated weekly. When a key result is off track, it should be visible to the whole company not hidden in a manager's spreadsheet."
      },
      {
        key: 'p5_d_5',
        title: 'Internal SOP Wiki',
        details:
          'A central, searchable repository for every documented process, organised by function. The measure of a good SOP wiki is whether a new hire can answer their own question using it in under 5 minutes.'
      },
      {
        key: 'p5_d_6',
        title: 'Infrastructure Scalability Plan',
        details:
          'A technical document showing how your current architecture handles 10x growth, where the bottlenecks are, and the specific upgrades needed to remove them. Reviewed quarterly.'
      }
    ]
  },
  {
    key: 'phase-6',
    index: 7,
    display_index: '6',
    industry_id: null,
    name: 'Phase 6: Market Expansion',
    short_name: 'Market Expansion',
    objective:
      'Enter new markets or customer segments with the same discipline you used to win your first - validate before committing, localise before launching.',
    must_have: [
      {
        key: 'p6_mh_1',
        title: 'Adapt your product to the specific workflows, language, and payment preferences of the new market do not just translate.',
        details:
          'Localisation is not translation. A product built for Mumbai users will have different workflow assumptions, pricing sensitivity, and support expectations than one for Tier 3 cities or international markets. Talk to 15 to 20 people in the target market before making a single product change.'
      },
      {
        key: 'p6_mh_2',
        title: 'Get legal and tax clearance for the new market before you acquire a single customer there.',
        details:
          'Every new geography brings different data privacy laws, GST or VAT structures, and business registration requirements. Operating without compliance clearance exposes you to penalties that can cost more than the market is worth. Hire local legal counsel not a general firm for each new market.'
      },
      {
        key: 'p6_mh_3',
        title: 'Hire a general manager who lives in the target market and already has relationships there.',
        details:
          'A local leader with an existing network will compress your first 6 months of market entry into 6 weeks. They know who to call, which partnerships matter, and how business is actually done there not how your assumptions say it should be done.'
      },
      {
        key: 'p6_mh_4',
        title: 'Validate demand in the new market with a small test before committing full resources.',
        details:
          'Run a localised landing page with ₹10,000 to ₹20,000 in targeted ads. Or sell manually to 5 customers in the new market before building anything new. If CAC in the test looks comparable to your home market, proceed. If not, understand why before scaling the problem.'
      },
      {
        key: 'p6_mh_5',
        title: 'Adjust your pricing for local purchasing power your home market price is rarely right for a new market.',
        details:
          'A ₹2,000 per month subscription that converts well in Mumbai may need to be ₹800 in a Tier 3 city or $15 in Southeast Asia. Purchasing power parity is real. Charging the same price everywhere is not premium positioning it is a conversion problem waiting to happen.'
      },
      {
        key: 'p6_mh_6',
        title: 'Set up local payment infrastructure before launch users will not pay if their preferred method is unavailable.',
        details:
          'UPI for India, SEPA for Europe, GrabPay for Southeast Asia. Research the top 2 to 3 payment methods in the target market and ensure they are live before acquiring your first customer there. Payment failure at checkout is the most invisible and most expensive conversion problem in market expansion.'
      }
    ],
    good_to_have: [
      {
        key: 'p6_gth_1',
        title: 'Partner with local voices creators, community leaders, or respected brands to build trust faster than you can organically.',
        details:
          "A local community leader with 10,000 engaged followers in your target market will outperform a global campaign every time. Find 3 to 5 people who already have your target customer's trust and structure a deal that is genuinely valuable to them not just a paid promotion."
      },
      {
        key: 'p6_gth_2',
        title: 'Run campaigns with messaging written specifically for the new market not translated from your existing campaigns.',
        details:
          'A campaign that works in your home market will underperform in a new one if it uses the same language, cultural references, and value propositions. Brief a local copywriter, not a translator. The goal is for the campaign to feel like it was written by someone who actually lives there.'
      },
      {
        key: 'p6_gth_3',
        title: 'Ensure your support team covers the timezone and language of the new market before your first customer there.',
        details:
          'A customer in a new market who cannot get support during their business hours will not refer you they will warn people. Staff your support function for the new timezone before your first customer there. Even a part-time local support resource changes the experience dramatically.'
      },
      {
        key: 'p6_gth_4',
        title: 'Introduce one adjacent product or feature designed for your most mature customer segment.',
        details:
          'Your earliest and most engaged customers have already adopted the core product. They are ready to buy more if you give them the right option. An upsell or adjacent feature increases LTV without increasing CAC the most efficient revenue expansion available at this stage.'
      },
      {
        key: 'p6_gth_5',
        title: 'Build a local distribution network through partners, agencies, or resellers who already serve your target customer.',
        details:
          'A local agency or reseller who already has relationships with your target customer can close deals you could not close in 12 months of direct selling. Structure a clear commercial agreement revenue share, support responsibilities, and exclusivity terms before the first referral happens.'
      },
      {
        key: 'p6_gth_6',
        title: 'Consider acquiring a smaller local competitor only if you have the legal infrastructure and capital to execute it cleanly.',
        details:
          'An acquisition can give you a customer base, a local team, and a market position that would take years to build organically. But it comes with legal complexity, integration risk, and cultural challenges that can consume more management time than the market is worth. Get independent legal and financial advice before initiating any conversation.'
      }
    ],
    deliverables: [
      {
        key: 'p6_d_1',
        title: 'Expansion Playbook',
        details:
          'A step-by-step document covering how you enter the new market localisation changes, legal clearances, hiring plan, channel strategy, and 90-day milestones. Updated as you learn and reused for each subsequent market entry.'
      },
      {
        key: 'p6_d_2',
        title: 'Localised Financial Forecast',
        details:
          'Projected revenue, CAC, and costs specifically for the new market not a copy of your home market numbers. Include the cost of localisation, local hiring, legal setup, and the expected payback period. Reviewed monthly against actuals.'
      },
      {
        key: 'p6_d_3',
        title: 'Compliance Clearance Checklist',
        details:
          'Signed confirmation from local legal counsel that you are cleared to operate, collect payments, and store customer data in the new market. This document should exist before your first customer acquisition, not after.'
      },
      {
        key: 'p6_d_4',
        title: 'Regional Launch Metrics',
        details:
          'Day-30 and Day-90 performance for the new market CAC, conversion rate, retention rate, and revenue. Compared directly against your home market benchmarks so you can identify gaps specific to the new geography.'
      },
      {
        key: 'p6_d_5',
        title: 'Product Localisation Matrix',
        details:
          'A tracking document showing every language, currency, workflow, and feature adaptation required for the new market, with completion status for each item. Reviewed weekly during the first 90 days of launch.'
      }
    ]
  },
  {
    key: 'phase-7',
    index: 8,
    display_index: '7',
    industry_id: null,
    name: 'Phase 7: Maturity & Exit Prep',
    short_name: 'Maturity & Exit Prep',
    objective:
      'Build a company that is financially clean, operationally independent, and ready for whatever comes next acquisition, IPO, or long-term ownership.',
    must_have: [
      {
        key: 'p7_mh_1',
        title: 'Get your last 3 years of financials formally audited by a recognised firm.',
        details:
          'Acquirers and IPO underwriters will not trust internally prepared numbers. A Big 4 or reputable mid-tier audit costs ₹5 to ₹20 lakhs depending on company size and is non-negotiable in any serious M&A or IPO process. Start this 12 to 18 months before you expect to need it.'
      },
      {
        key: 'p7_mh_2',
        title: 'Make sure every piece of IP code, brand, content, inventions is formally owned by the company, not by an individual.',
        details:
          "If a founder, early employee, or vendor created something without a formal IP assignment agreement, you may not legally own it. An acquirer's lawyers will find this in due diligence and use it to reduce the price or kill the deal. Fix every gap before any exit process begins."
      },
      {
        key: 'p7_mh_3',
        title: 'Check whether your business can grow without you in it every day and fix every place it cannot.',
        details:
          'An acquirer buying a business that depends entirely on the founder is buying a job, not a company. Document every process, distribute decision authority, and ensure your leadership team can run operations independently for at least 3 months. This is the single biggest value driver in a private company acquisition.'
      },
      {
        key: 'p7_mh_4',
        title: 'Compile every document an acquirer or investor will ask for into one clean, organised data room.',
        details:
          'Incorporation documents, shareholder agreements, all customer contracts, vendor agreements, employment contracts, IP assignments, financial statements, and product documentation. Organised by category. Accessible via a secure link. A well-organised data room signals a well-run company before a single meeting takes place.'
      },
      {
        key: 'p7_mh_5',
        title: 'Resolve every outstanding cap table issue dead equity, informal agreements, and unconverted notes.',
        details:
          'Dead equity held by departed founders, convertible notes not yet converted, verbal equity promises these will surface in due diligence and either kill the deal or reduce your payout. Fix them now while you have leverage and time. Under M&A pressure these conversations become significantly harder.'
      },
      {
        key: 'p7_mh_6',
        title: 'Establish a formal board with at least one or two independent directors.',
        details:
          'A board with independent directors signals governance maturity to any acquirer or underwriter. Independent directors bring credibility, external perspective, and legal cover for key decisions. In an IPO process this is a regulatory requirement. In M&A it is a trust signal that measurably affects valuation.'
      }
    ],
    good_to_have: [
      {
        key: 'p7_gth_1',
        title: 'Engage an investment banker or M&A advisor 12 to 18 months before you plan to transact.',
        details:
          "A good M&A advisor runs a competitive process multiple potential acquirers are aware simultaneously, which drives up the price. Founders who sell directly to the first interested party almost always leave significant money on the table. The advisor's fee of 1 to 3% of deal value typically pays for itself several times over."
      },
      {
        key: 'p7_gth_2',
        title: 'Start building relationships with the 3 to 5 companies most likely to acquire you 2 years before you want to sell.',
        details:
          'Do joint webinars, build integrations, send thoughtful articles to their business development teams. The goal is to be a familiar, trusted name when their acquisition appetite is live. Cold M&A approaches have a fraction of the success rate of warm ones.'
      },
      {
        key: 'p7_gth_3',
        title: 'Clean up your debt and optimise cash reserves to make your balance sheet as attractive as possible.',
        details:
          'High debt loads reduce acquisition prices directly most deals are priced on a debt-free, cash-free basis. Pay down expensive debt, convert convertible instruments, and build a clean cash position at least 12 months before you begin an exit process.'
      },
      {
        key: 'p7_gth_4',
        title: 'Groom your VP or COO to step into the CEO role comfortably with or without an acquisition.',
        details:
          'An acquirer wants to know the business continues after you leave. A successor who has been running day-to-day operations for 12+ months gives them confidence. This also protects you a buyer who needs you to stay 3 years post-acquisition has significant leverage over your earnout.'
      },
      {
        key: 'p7_gth_5',
        title: 'Structure the potential transaction to minimise the tax impact on founders and early investors.',
        details:
          'In India, long-term capital gains on unlisted shares held more than 24 months are taxed differently from short-term gains. The structure of the deal asset sale versus share sale, earnout structure, deferred consideration significantly affects net payout. Get a tax advisor involved 12 months before any transaction, not after you sign a term sheet.'
      },
      {
        key: 'p7_gth_6',
        title: 'Plan your personal finances for the liquidity event this is the most overlooked part of exit preparation.',
        details:
          'Most founders have never managed the amount of money a successful exit generates. Before the transaction closes, engage a wealth manager, understand your tax liability, and decide how you will deploy the proceeds. Founders who have not thought this through make reactive financial decisions immediately after exit that they spend years correcting.'
      }
    ],
    deliverables: [
      {
        key: 'p7_d_1',
        title: 'Master M&A Data Room',
        details:
          'The complete, organised vault of every document an acquirer needs for due diligence. Accessible via a secure link with an index document showing exactly where to find every category. A well-organised data room shortens due diligence from months to weeks.'
      },
      {
        key: 'p7_d_2',
        title: 'Audited Financial Statements',
        details:
          'Three years of formally audited financials, stamped and signed by a recognised audit firm. The foundation of every valuation conversation. Without this, no serious acquirer or underwriter will proceed past initial discussions.'
      },
      {
        key: 'p7_d_3',
        title: 'IP Ownership Matrix',
        details:
          'A document proving the company legally owns every piece of IP with original assignment agreements on file for each item. This eliminates the most common deal-killing discovery in tech and product company due diligence.'
      },
      {
        key: 'p7_d_4',
        title: 'Founder Succession Plan',
        details:
          "A written plan showing who runs what after the founder reduces day-to-day involvement, including a 90-day transition plan for each key founder responsibility. This gives an acquirer confidence that business value survives the founder's departure."
      },
      {
        key: 'p7_d_5',
        title: 'Exit Strategy Financial Models',
        details:
          'Spreadsheet models showing net payout to founders and investors under 3 to 5 different exit scenarios varying valuation, deal structure, debt position, and tax treatment. Run these before you receive a term sheet, not after.'
      }
    ]
  }
]
