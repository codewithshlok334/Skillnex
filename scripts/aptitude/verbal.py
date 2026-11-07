import random

def populate(add,numeric,fmt):
    def q(topic,title,prompt,answer,wrong,why,level='Medium',passage=''):
        add('Verbal',topic,title,prompt,answer,wrong,why,level,passage)
    vocabulary=[
      ('ambiguous','open to more than one interpretation','unambiguous','expensive','temporary'),
      ('mitigate','reduce the severity of','aggravate','conceal permanently','measure exactly'),
      ('candid','frank and honest','evasive','exhausted','indifferent'),
      ('ubiquitous','present almost everywhere','rare','fragile','profitable'),
      ('meticulous','very attentive to detail','careless','outspoken','temporary'),
      ('pragmatic','guided by practical results','impractical','nostalgic','hostile'),
      ('transient','lasting only a short time','permanent','transparent','expensive'),
      ('tenacious','persistent and determined','readily giving up','talkative','predictable'),
      ('lucid','clear and easy to understand','obscure','lengthy','friendly'),
      ('frugal','economical in using resources','wasteful','fearful','critical'),
      ('bolster','support or strengthen','undermine','postpone','imitate'),
      ('obsolete','no longer in use','current','beautiful','complex'),
      ('concise','brief but complete','wordy','inaccurate','urgent'),
      ('sporadic','occurring irregularly','continuous','intentional','profitable'),
      ('impartial','fair and unbiased','biased','uncertain','silent'),
      ('exacerbate','make more severe','alleviate','predict','classify'),
      ('reticent','reluctant to speak freely','forthcoming','forgetful','aggressive'),
      ('robust','strong and resilient','fragile','recent','colourful'),
      ('superfluous','more than is needed','essential','unfamiliar','portable'),
      ('converge','move towards a common point','diverge','accelerate','rotate')]
    for word,meaning,opposite,w1,w2 in vocabulary:
        level='Hard' if word in ['tenacious','reticent','superfluous','exacerbate','ubiquitous','impartial'] else 'Medium'
        q('Vocabulary',f'Meaning: {word}',f'Choose the closest meaning of “{word}” in formal English.',meaning,[opposite,w1,w2],f'“{word.capitalize()}” means {meaning}. “{opposite}” expresses the opposite idea; the other choices change the meaning.',level)
        q('Vocabulary',f'Opposite: {word}',f'Choose the most direct antonym of “{word}”.',opposite,[meaning,w1,w2],f'The contrast is between {meaning} and {opposite}. That makes “{opposite}” the best antonym.',level)

    grammar=[
      ('Neither the architect nor the developers ___ available today.','are',['is','was','has'],'With neither/nor, the verb agrees with the nearer subject. “Developers” is plural.'),
      ('Each of the test cases ___ a separate identifier.','has',['have','are having','were having'],'The subject is “each”, which is singular; “of the test cases” does not change agreement.'),
      ('By the time the audit started, the team ___ the report.','had completed',['has completed','will complete','completes'],'The earlier of two past events takes the past perfect: had completed.'),
      ('If I had reviewed the logs, I ___ the fault sooner.','would have found',['will find','would find','had found'],'An unreal past condition uses if + past perfect and would have + past participle.'),
      ('The manager insisted that every applicant ___ on time.','be',['is','was','being'],'After a demand such as “insisted that”, the formal subjunctive uses the base form “be”.'),
      ('Hardly had the demo begun ___ the projector failed.','when',['than','then','that'],'The standard paired construction is “hardly … when”; “no sooner” pairs with “than”.'),
      ('No sooner had the patch shipped ___ a new defect appeared.','than',['when','then','that'],'“No sooner … than” links two events occurring in quick succession.'),
      ('She is interested ___ working on distributed systems.','in',['on','for','at'],'The adjective “interested” takes “in”, followed here by a gerund.'),
      ('The role requires designing tests, reviewing code, and ___ documentation.','writing',['to write','wrote','written'],'Parallel items must have the same grammatical form: designing, reviewing, writing.'),
      ('There are ___ defects in this build than in the previous one.','fewer',['less','little','much'],'Countable plural nouns such as defects take “fewer”.'),
      ('The amount of memory used by these processes ___ increasing.','is',['are','have','were'],'The singular head noun “amount” controls the verb, not the plural “processes”.'),
      ('This is the engineer ___ design passed the safety review.','whose',['who','whom','which'],'“Whose” indicates possession: the design belongs to the engineer.'),
      ('The document was reviewed by Nisha and ___.','me',['I','myself alone I','mine'],'After the preposition “by”, use the object pronoun “me”.'),
      ('Had the server been backed up, we ___ the records.','could have recovered',['can recover','could recovered','have recovered'],'The inverted conditional means “If the server had been backed up”; its result uses could have recovered.'),
      ('Not only ___ the issue, but she also documented the fix.','did she diagnose',['she diagnosed','she did diagnose','does she diagnosed'],'Initial “not only” triggers subject–auxiliary inversion: did she diagnose.'),
      ('The results of the experiment ___ consistent with the hypothesis.','are',['is','has','was'],'The head noun “results” is plural, so it requires “are”.'),
      ('The data must be checked before the report ___ published.','is',['will','has','would'],'A time clause after “before” uses the present tense for a future event; passive form is “is published”.'),
      ('I look forward to ___ from your team.','hearing',['hear','have heard','heard'],'Here “to” is a preposition, so it takes the gerund “hearing”, not the infinitive.'),
      ('The tool is capable ___ processing large files.','of',['to','for','with'],'The fixed construction is “capable of” followed by a noun or gerund.'),
      ('If the connection fails, the client ___ automatically.','will retry',['would have retried','had retried','were retrying'],'A real future condition uses present simple in the if-clause and “will” in the result.'),
      ('She has worked on this project ___ February.','since',['for','during two','from since'],'Use “since” for a starting point and “for” for a duration.'),
      ('Despite ___ exhausted, the team completed the handover.','being',['was','they were','be'],'“Despite” is a preposition; it takes a noun phrase or gerund, not a finite clause.'),
      ('The software, along with its plugins, ___ updated weekly.','is',['are','have','were'],'“Along with” adds information but does not make the singular subject “software” plural.'),
      ('The recruiter asked whether I ___ travel.','could',['can be','will can','am can'],'“Could” correctly expresses reported ability or willingness after the past-tense “asked”.'),
      ('It is high time we ___ the outdated process.','changed',['change','will change','had been change'],'“It is high time” conventionally takes a past form to express a change that should happen now.')]
    for i,(stem,answer,wrong,why) in enumerate(grammar,1):
        q('Grammar and sentence correction',f'Grammar check {i:02}',f'Choose the grammatically correct completion:\n{stem}',answer,wrong,why,'Hard' if i in [4,5,6,7,14,15,22,25] else 'Medium')

    blanks=[
      ('Although the proposal looked ___, a detailed review exposed several ___ assumptions.','promising; flawed',['flawed; reliable','irrelevant; sound','complete; proven'],'“Although” signals a contrast: initial promise is contradicted by flawed assumptions.'),
      ('The scientist remained ___ about the finding because the evidence was still ___.','cautious; inconclusive',['certain; inconclusive','careless; conclusive','indifferent; decisive'],'Inconclusive evidence reasonably calls for caution, not certainty.'),
      ('A ___ explanation removes confusion; a ___ one adds to it.','lucid; convoluted',['vague; concise','lengthy; clear','confusing; coherent'],'A lucid explanation is clear; a convoluted explanation is unnecessarily complicated.'),
      ('The team chose to ___ the launch rather than ___ user privacy.','postpone; compromise',['accelerate; protect','cancel; strengthen','ignore; guarantee'],'“Rather than” contrasts delaying the launch with risking privacy.'),
      ('The review was ___: it praised strong design but also identified ___ weaknesses.','balanced; substantial',['biased; imaginary','uncritical; substantial','favourable; nonexistent'],'A balanced review recognises both strengths and meaningful weaknesses.'),
      ('Because the sample was not ___ of the population, the conclusion could not be safely ___.','representative; generalised',['independent; repeated','large; described','random; questioned'],'Generalisation requires a representative sample; sample size alone cannot remove selection bias.'),
      ('The new evidence did not ___ the theory; instead, it ___ its main prediction.','refute; supported',['support; confirmed','challenge; weakened','verify; contradicted'],'“Instead” requires opposite actions: failure to refute, followed by support.'),
      ('To keep the instructions ___, the editor removed ___ details.','concise; superfluous',['vague; essential','lengthy; unnecessary','ambiguous; redundant'],'Conciseness improves when unnecessary details are removed.'),
      ('A robust plan should ___ ordinary failures and ___ recovery procedures.','anticipate; specify',['deny; hide','ignore; describe','cause; prohibit'],'Good planning anticipates failures and defines how recovery should work.'),
      ('The analyst distinguished ___ from causation and avoided an ___ claim.','correlation; unwarranted',['certainty; accurate','proof; cautious','randomness; justified'],'Correlation alone does not establish causation, so stronger causal claims may be unwarranted.'),
      ('Her tone was ___ rather than confrontational, making a ___ discussion possible.','conciliatory; constructive',['hostile; productive','dismissive; cooperative','accusatory; calm'],'A conciliatory tone aims to reduce conflict and support constructive discussion.'),
      ('The fix was ___; it addressed the symptom but left the ___ cause untouched.','superficial; underlying',['comprehensive; obvious','permanent; trivial','preventive; resolved'],'A superficial fix treats appearances without resolving the underlying cause.'),
      ('The mentor encouraged ___ questions, not ___ agreement.','probing; unquestioning',['irrelevant; critical','silent; thoughtful','leading; independent'],'Probing questions investigate deeply; unquestioning agreement avoids scrutiny.'),
      ('The historical data were ___, so the team reported a ___ estimate.','incomplete; tentative',['complete; certain','reliable; definitive','precise; guaranteed'],'Incomplete data support a provisional, or tentative, estimate.'),
      ('The rule was applied ___ to everyone, preventing ___ treatment.','uniformly; preferential',['selectively; unequal','arbitrarily; special','loosely; unfair'],'Uniform application prevents preferential treatment of selected people.'),
      ('The team needed to ___ competing requirements without ___ the essential safeguards.','reconcile; weakening',['separate; preserving','dismiss; removing','ignore; improving'],'Reconciling balances requirements; keeping safeguards intact means not weakening them.'),
      ('The anomaly was ___ rather than persistent, appearing only at ___ intervals.','sporadic; irregular',['continuous; regular','constant; brief','permanent; random'],'Sporadic means occasional and irregular, contrasting with persistent.'),
      ('An ___ claim can be checked against evidence; an ___ one avoids any possible test.','empirical; unfalsifiable',['unfalsifiable; empirical','emotional; measured','arbitrary; verifiable'],'An empirical claim is evidence-based and testable; an unfalsifiable claim cannot be contradicted by a test.'),
      ('The speaker ___ the distinction, ensuring that listeners did not ___ the two concepts.','clarified; conflate',['blurred; confuse','ignored; separate','concealed; combine'],'Clarifying a distinction helps listeners avoid conflating, or merging, different concepts.'),
      ('Instead of ___ the criticism, the author ___ the argument to address it.','dismissing; revised',['accepting; ignored','examining; weakened without reason','seeking; concealed'],'Revising the argument is a constructive response to criticism rather than dismissing it.')]
    for i,(stem,answer,wrong,why) in enumerate(blanks,1):q('Sentence completion',f'Two-blank reasoning {i:02}',stem,answer,wrong,why,'Hard')

    stories=[
      ['A library extended its opening hours for a month.','During that month, evening attendance increased.','The librarians then compared attendance with the previous term.','On the basis of that comparison, they recommended keeping the longer hours.'],
      ['A sensor began reporting unusually high temperatures.','The technician first compared its readings with a reference sensor.','That comparison revealed a calibration error.','After recalibration, both sensors agreed.'],
      ['The team proposed a new onboarding guide.','Before publishing it, they asked five new employees to try it.','The trial exposed two confusing steps.','Those steps were rewritten in the final guide.'],
      ['A researcher noticed that the experiment could not be reproduced.','She checked the recorded settings before repeating it.','The records showed that one setting had been omitted.','Documenting that setting made the next replication successful.'],
      ['A village planned to collect rainwater.','Engineers first measured the available roof area.','They used those measurements to estimate storage capacity.','The resulting estimate determined the size of the tanks.'],
      ['A website received complaints about slow loading.','Developers measured the time spent on each request.','The measurements identified an oversized image as the main delay.','Compressing that image improved loading time.'],
      ['A student decided to improve her spoken English.','She recorded a short explanation every evening.','Listening to those recordings revealed repeated filler words.','She then practised pausing instead of using those fillers.'],
      ['The factory introduced a new packaging machine.','Operators recorded its errors during the first week.','The records showed that jams clustered after long runs.','Adding a cooling interval reduced those jams.'],
      ['A museum planned an exhibition on local history.','Curators collected photographs from residents.','They compared the photographs with dated records.','The verified photographs became the core of the exhibition.'],
      ['A school wanted to reduce food waste.','Students weighed leftovers for ten days.','The data showed that one dish was often left untouched.','The kitchen replaced that dish in the next menu.'],
      ['A commuter group requested an earlier bus.','The transit agency surveyed morning passengers.','The survey revealed substantial demand before seven.','An additional early service was scheduled in response.'],
      ['A programmer suspected that a function was leaking memory.','She monitored memory after repeated calls.','The measurements confirmed a steady rise.','Releasing an unused buffer stopped that rise.'],
      ['A club organised a charity run.','Registrations soon exceeded the capacity of the original route.','The organisers therefore consulted the local authorities.','With permission, they moved the event to a larger circuit.'],
      ['An editor received a draft with inconsistent terminology.','He created a list of the competing terms.','The authors agreed on one term for each concept.','The revised draft followed that agreed vocabulary.'],
      ['A gardener found that several plants were wilting.','She tested soil moisture rather than immediately adding fertiliser.','The test showed that the soil was already waterlogged.','Improving drainage allowed the plants to recover.'],
      ['A team considered adopting a new database.','They first ran a trial using representative queries.','The trial showed faster reads but slower updates.','They used that trade-off to decide whether migration was worthwhile.'],
      ['A town launched a bicycle-sharing pilot.','After three months, planners examined trip records.','The records showed heavy use near the railway station.','More bicycles were placed there for the next phase.'],
      ['A student discovered an unfamiliar formula in a paper.','She traced its citation to the original derivation.','Reading that derivation revealed a limiting assumption.','She included the assumption when using the formula in her report.'],
      ['A warehouse introduced barcode labels.','Staff scanned a sample shipment before full adoption.','The sample revealed that reflective wrapping prevented reliable scans.','Moving the labels to a matte surface solved the problem.'],
      ['A research group developed a forecasting model.','They reserved recent observations for evaluation.','Testing on those observations revealed systematic underestimation.','They revised the model before deploying it.']]
    for i,sentences in enumerate(stories,1):
        order=list(range(4));random.Random(710+i).shuffle(order)
        correct=' → '.join('ABCD'[order.index(j)] for j in range(4))
        alternatives=[]
        for sequence in [(1,0,2,3),(0,2,1,3),(3,2,1,0)]:alternatives.append(' → '.join('ABCD'[order.index(j)] for j in sequence))
        passage='\n'.join(f'{"ABCD"[j]}. {sentences[index]}' for j,index in enumerate(order))
        q('Para-jumbles',f'Build a paragraph {i:02}','Choose the most coherent order of the four sentences.',correct,alternatives,
          'Start with the situation, then the investigation or action, followed by the evidence and its outcome. The correct order is '+correct+'.','Hard',passage)

    passages=[
      ('A university offered an optional weekend workshop. Participants later scored higher than non-participants on a common test. The groups had not been randomly assigned, and the university had no record of their prior scores. The coordinator described the result as encouraging but said a controlled study was needed before attributing the difference to the workshop.',[
       ('Why is a causal conclusion premature?','The groups may have differed before the workshop',['The test had no scores','Weekend teaching is impossible','Every participant cheated'],'Prior ability and motivation could explain the difference; non-random selection leaves these uncontrolled.'),
       ('Which conclusion is directly supported?','Participants scored higher on the later test',['The workshop caused every improvement','Non-participants learned nothing','The groups had equal prior ability'],'Only the observed score difference is stated; its cause remains uncertain.'),
       ('What does “controlled study” aim to improve here?','The ability to isolate the workshop’s effect',['The number of weekends in a month','The workshop’s advertising reach','The length of the test paper'],'A controlled comparison helps separate the intervention from pre-existing differences.'),
       ('Which word best describes the coordinator’s tone?','Cautiously optimistic',['Hostile','Absolutely certain','Dismissive'],'The result is called encouraging, but the coordinator explicitly withholds a causal claim.'),
       ('What additional information would most help assess selection bias?','Comparable pre-workshop test scores',['The colour of the classroom walls','The coordinator’s favourite subject','The time the announcement was printed'],'Baseline scores would show whether the groups already differed in measured ability.')]),
      ('A city installed energy-efficient streetlights. Electricity used per lamp fell by 40%, but the number of lamps increased by 50% during the same year. Officials therefore distinguished efficiency per lamp from total electricity consumption. Residents were told that a more efficient device does not automatically produce an equally large reduction in a system’s overall resource use.',[
       ('What is the central distinction?','Efficiency per unit versus total consumption',['Electricity versus street names','Cost versus colour','Daylight versus moonlight'],'The passage contrasts the energy used by each lamp with the energy used by the expanded system.'),
       ('Relative to the old total, what is the new electricity use?','90%',['60%','110%','150%'],'Multiply 0.60 energy per lamp by 1.50 as many lamps: 0.90 of the original total.'),
       ('Which claim is contradicted by the figures?','Total consumption must have fallen by 40%',['Each new lamp uses less energy','There are more lamps','Per-lamp and total savings differ'],'A 40% per-lamp saving does not equal a 40% total saving when lamp count grows.'),
       ('Why do officials separate the two measures?','To avoid overstating the total reduction',['To hide the number of lamps','To prove all efficient devices fail','To claim electricity is free'],'Presenting only per-unit efficiency could exaggerate actual system-wide savings.'),
       ('Which broader lesson follows?','Changes in scale can offset efficiency gains',['Efficiency never matters','More lamps always reduce use','Resource use cannot be measured'],'The growth in lamp count partially offsets the energy saving per lamp.')]),
      ('A documentation team replaced a long manual with short searchable articles. New employees found specific answers faster, but some reported that they struggled to understand how the pieces fitted together. The team kept the articles and added an introductory overview with links to the relevant sections. Its aim was to support both quick lookup and a coherent mental model.',[
       ('What problem remained after the first change?','Understanding the overall structure',['Finding any individual answer','Accessing the search box','Reading short sentences'],'The reported weakness was connecting the pieces, not finding individual facts.'),
       ('Why was an overview added?','To connect the separate articles',['To remove all search functions','To replace every article','To discourage new employees'],'The overview supplies context and relationships while retaining quick lookup.'),
       ('What does “mental model” mean here?','An organised understanding of how the system works',['A photograph of an employee','A memorised password','A physical prototype'],'In this context it means a coherent internal picture of the system and its relationships.'),
       ('Which description best fits the final approach?','Combining complementary formats',['Abandoning documentation','Returning to the exact original manual','Prioritising speed at any cost'],'Articles support lookup; the overview supports understanding. Both are retained.'),
       ('What is the passage’s implied view of searchability?','Useful but not sufficient for every learning need',['Always harmful','A complete substitute for context','Unrelated to documentation'],'Search improved lookup, but contextual learning still required additional support.')]),
      ('A company predicted demand from last year’s sales. However, several products had repeatedly been out of stock. The analyst noted that recorded sales measured completed purchases, not every purchase customers wished to make. She recommended combining sales records with stockout information and waiting-list requests before using the figures to plan production.',[
       ('Why might recorded sales underestimate demand?','Some desired purchases could not be completed',['Every customer bought twice','Prices were always zero','Production exceeded all demand'],'Stockouts prevent sales even when people wish to buy.'),
       ('Which extra data directly address the problem?','Stockout periods and waiting-list requests',['Office paint colours','Staff birthdays','Delivery van brands'],'These records can provide evidence of unmet demand during unavailable periods.'),
       ('What distinction does the analyst make?','Observed purchases versus desired purchases',['Profit versus accounting rules','Factories versus shops','Online versus offline advertising'],'Completed sales need not capture the full quantity customers wanted.'),
       ('Which conclusion goes beyond the passage?','Every product’s demand doubled',['Some products were unavailable','Sales alone may be insufficient','Additional records may help'],'No numerical size of unmet demand, let alone doubling, is established.'),
       ('Which heading best captures the passage?','When sales do not reveal all demand',['Why customers never wait','The end of production planning','How to eliminate all uncertainty'],'The central point is that sales data can be constrained by availability.')]),
      ('Researchers published a prediction tool and reported its average error across all users. An independent review found that the average concealed much larger errors for one small group. The researchers then published results by group and stated where the tool should not be used. They argued that transparent limitations were more useful than a single flattering headline number.',[
       ('What did the average conceal?','Unequal performance across groups',['The tool’s file name','The number of researchers','A completely absent dataset'],'The average hid worse performance in a smaller subgroup.'),
       ('Why report group-level results?','To reveal differences hidden by aggregation',['To guarantee zero errors','To replace all evaluation','To make every group identical'],'Breaking down aggregate results exposes variation in performance.'),
       ('Which statement matches the researchers’ final position?','Limitations should be disclosed clearly',['Only the best average should be published','The tool is valid everywhere','Small groups need no evaluation'],'They publish where the tool should not be used and favour transparent limitations.'),
       ('What does “flattering” suggest about the headline number?','It makes performance look more favourable',['It is necessarily fabricated','It describes personal appearance','It contains no numerical value'],'A flattering summary creates a favourable impression; the passage does not claim it was fabricated.'),
       ('Which next step is most consistent with the passage?','Investigate and improve performance in the poorly served group',['Suppress the independent review','Remove all group labels from evaluation','Declare the average a perfect guarantee'],'The focus on transparent group performance supports diagnosing and improving the identified weakness.')])]
    for i,(passage,items) in enumerate(passages,1):
        for j,(stem,answer,wrong,why) in enumerate(items,1):q('Reading comprehension',f'Passage {i} · question {j}',stem,answer,wrong,why,'Hard' if j in [1,3,5] else 'Medium',passage)

    critical=[
      ('A team claims its new meeting policy caused productivity to rise. During the same month, two additional engineers joined. Which fact most weakens the causal claim?','The staffing increase could explain the rise',['The meetings had written agendas','The policy had a memorable name','The office had windows'],'An alternative cause undermines attributing the improvement solely to the policy.'),
      ('A survey of a paid coding course asks only students who completed every lesson whether it was useful. What is the main risk?','Survivorship or selection bias',['A guaranteed calculation error','An impossible sample size','An absence of any opinions'],'Excluding dropouts may systematically omit dissatisfied or struggling students.'),
      ('“All reliable services have monitoring. This service has monitoring, so it is reliable.” Identify the flaw.','Affirming the consequent',['Denying all evidence','Using a contradiction correctly','Applying modus ponens'],'Reliable → monitoring does not establish monitoring → reliable.'),
      ('A claim says a training program reduces errors. Which evidence most strongly supports it?','Randomly assigned groups performing the same task, with fewer errors in the trained group',['A testimonial from the trainer','A larger advertising budget','A new logo for the program'],'Random assignment and a common task reduce confounding and make the comparison more informative.'),
      ('“We should extend library hours because many students cannot visit before closing.” Which assumption is needed?','At least some of those students could visit during the proposed extra hours',['Every student likes all books','The library must open all night','No student can visit at present'],'The extension helps the cited group only if the new hours are usable by some of them.'),
      ('A product has twice as many complaints this year, while its number of users has quadrupled. What follows about complaints per user?','They have halved',['They have doubled','They are unchanged','They have quadrupled'],'Rate ratio = 2/4 = 1/2. Absolute counts and per-user rates move differently.'),
      ('A report finds that people who own umbrellas are more likely to have wet shoes. What is the best caution?','Rain can cause both umbrella use and wet shoes',['Umbrellas definitely cause rain','Wet shoes are impossible','No relationship can ever be studied'],'A common cause can create correlation without either measured variable causing the other.'),
      ('An evaluator judges a candidate only by the first impressive answer, ignoring several later weak answers. Which bias best describes this?','Anchoring on the initial impression',['Random sampling','Double-blind evaluation','Independent replication'],'The initial answer disproportionately shapes the overall assessment despite later evidence.'),
      ('“Some remote employees are designers. All designers use a drawing tool.” Which conclusion follows?','Some remote employees use a drawing tool',['All remote employees are designers','All tool users are remote employees','No designer works remotely'],'The remote employees who are designers must use the tool; nothing supports the universal alternatives.'),
      ('A proposed software change improves speed but removes an essential accessibility function. Which response best evaluates the trade-off?','Assess speed and accessibility together before deciding',['Approve it using speed alone','Ignore every speed measurement','Assume every user has identical needs'],'A sound evaluation considers the stated benefit and the loss of essential functionality together.')]
    for i,(stem,answer,wrong,why) in enumerate(critical,1):q('Critical reasoning',f'Evaluate an argument {i:02}',stem,answer,wrong,why,'Hard')
