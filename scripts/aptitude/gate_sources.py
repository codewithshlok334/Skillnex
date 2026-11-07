"""20 concise paraphrases; answers checked against the official final 2024 keys.
Avoid withdrawn / marks-to-all items. Option order is our own, so store answer values.
"""
def populate(add,numeric,fmt):
    papers={'CS1':'CS124S5.pdf','DA':'DA24S1.pdf','ME':'ME24S2.pdf','EC':'EC24S7.pdf','EE':'EE24S8.pdf'}
    base='https://gate2026.iitg.ac.in/doc/download/2024/'
    def q(paper,no,category,topic,prompt,answer,wrong,why,level='Medium'):
        source={'kind':'GATE_PYQ','label':f'GATE 2024 {paper} · Q{no} (paraphrased)',
          'url':base+papers[paper],'answerKeyUrl':base+paper+'FinalAnswerKey.pdf',
          'year':2024,'paper':paper,'questionNumber':no,'verifiedOn':'2026-11-08',
          'note':'Wording/options adapted. Official paper and final key linked; SkillNex difficulty is editorial.'}
        add(category,topic,f'GATE 2024 {paper} · Q{no}',prompt,answer,wrong,why,level,source=source)
    q('CS1',2,'Quantitative','Algebra','Nonzero, distinct reals satisfy x+y=k(x−y) for fixed k. How does x/y behave?',
      'It is constant',['It varies only with x','It varies only with y','It equals xy'],'Rearrange: (k−1)x=(k+1)y, so x/y=(k+1)/(k−1).')
    q('CS1',3,'Quantitative','Statistics','Find the median: 69, 17, 15, 14, 13, 11, 11, 10, 18, 9.',
      '13.5',['14','11','18.7'],'After sorting, the middle values are 13 and 14. Their mean is 13.5.')
    q('CS1',4,'Quantitative','Percentages','Counts of Rs 1, Rs 5 and Rs 10 coins are proportional to 5, 3 and 13. What percentage of their value comes from Rs 5 coins?',
      '10%',['15%','20%','30%'],'Values are proportional to 5, 15, 130. Thus 15/150=10%.')
    q('CS1',5,'Quantitative','Logarithms','For positive p,q, log(p²+q²)=log(p)+log(q)+2log(3). Evaluate (p⁴+q⁴)/(p²q²).',
      '79',['81','9','83'],'The log equation gives p²+q²=9pq. Square, divide by p²q², then subtract 2.','Hard')
    q('DA',3,'Quantitative','Permutations','Using distinct digits from {1,3,4,6,7}, count four-digit multiples of 3.',
      '48',['24','72','12'],'All digits sum to 21. Omit 3 or 6, then arrange: 2×4!=48.','Hard')
    q('DA',4,'Quantitative','Sequences and series','Add the two infinite sequences 1+1/2+1/4+… and 1+1/3+1/9+… .',
      '7/2',['11/3','13/4','9/2'],'Their geometric sums are 2 and 3/2, totalling 7/2.')
    q('DA',7,'Quantitative','Probability','Three independent births have equally likely boy/girl outcomes. Find P(exactly two girls).',
      '3/8',['1/8','1/4','1/2'],'Choose the boy’s position: 3 possibilities, each of probability 1/8.')
    q('DA',8,'Quantitative','Data interpretation','Two investors place (10000,20000,20000) and (20000,15000,15000) rupees in funds A,B,C. B,C return 15%. The first gains Rs 500 more. Find A’s return.',
      '10%',['7.5%','15%','20%'],'The gain difference is −10000r+10000×0.15=500, giving r=0.10.','Hard')
    q('ME',1,'Verbal','Vocabulary','Complete an increasing-intensity chain: disapprove → ___ → chide.',
      'reprove',['praise','reprise','grieve'],'Reprove means express disapproval; chide intensifies it to scolding.')
    q('ME',2,'Reasoning','Number patterns','Which entry differs by primality: 19,37,21,17,23,29,31,11?',
      '21',['29','37','23'],'21=3×7 is composite; every other listed number is prime.','Easy')
    q('ME',3,'Reasoning','Number series','Which entry breaks the Fibonacci recurrence in 1,1,2,3,6,8,13,21?',
      '6',['8','21','13'],'Each term should sum the preceding two. The fifth should be 2+3=5.','Easy')
    q('ME',5,'Quantitative','Probability','Two independent fair four-outcome dice have labels 2,3,5,7. What is P(sum>11)?',
      '3/16',['3/8','1/8','1/16'],'Only (5,7), (7,5), (7,7) qualify among 16 equally likely ordered outcomes.')
    q('EC',1,'Verbal','Vocabulary','Complete the intensity progression: bored → ___ → weary.',
      'jaded',['baffled','dead','worsted'],'Jaded conveys tiredness from excessive exposure and fits the progression.')
    q('EC',3,'Quantitative','Ratios and ages','Five years earlier, son:father ages were 1:4; five years later they will be 2:5. Find their age difference.',
      '30 years',['28 years','35 years','32 years'],'Let earlier ages be t,4t. (t+10)/(4t+10)=2/5 gives t=10; difference=30.','Hard')
    q('EC',4,'Quantitative','Logarithms','Solve 1/log₂x + 1/log₃x + 1/log₄x=1, with x>1.',
      '24',['4','12','36'],'Change base: logₓ2+logₓ3+logₓ4=logₓ24=1. Thus x=24.','Hard')
    q('EC',5,'Quantitative','Number systems','Find the largest prime divisor of 3^199−3^196.',
      '13',['17','3','11'],'Factor as 3^196(27−1)=3^196×2×13. The largest prime is 13.','Hard')
    q('EE',1,'Verbal','Vocabulary','Complete the progression: please → ___ → pander.',
      'flatter',['flutter','fritter','frizzle'],'Flattery is stronger ingratiation; pandering goes further to indulge another’s wishes.')
    q('EE',3,'Quantitative','Number systems','Express the decimal value 108 using base eight.',
      '154',['168','150','108'],'108=1×64+5×8+4, so its octal representation is 154.','Easy')
    q('EE',4,'Quantitative','Profit and loss','A shirt’s bill is Rs 3186 after 20% markup on cost and 18% tax on selling price. Find cost.',
      '2250',['2500','1975.40','2548.80'],'Undo tax and markup: 3186/(1.18×1.20)=2250.')
    q('EE',5,'Quantitative','Algebra','If x:y=(a+1):(a−1), a>1, simplify (x²−y²):(x²+y²).',
      '2a:(a²+1)',['a:(a²+1)','2a:(a²−1)','a:(a²−1)'],'Expand the squares: numerator 4a, denominator 2(a²+1); cancel 2.')
