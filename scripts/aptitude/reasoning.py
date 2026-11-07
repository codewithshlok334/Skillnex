from fractions import Fraction as F
from itertools import permutations
from math import comb, factorial
from datetime import date,timedelta

def populate(add,numeric,fmt):
    names=['Arun','Bela','Chetan','Diya','Eshan','Farah','Gopal','Hina','Isha']
    words=['LOGIC','BRAIN','THINK','SOLVE','LEARN']
    for v in range(1,6):
        def q(topic,title,prompt,answer,wrong,why,level='Hard',passage=''):
            add('Reasoning',topic,f'{title} · {v}',prompt,answer,wrong,why,level,passage)
        def n(topic,title,prompt,answer,why,level='Hard',wrong=None):
            numeric(topic,f'{title} · {v}',prompt,answer,why,level,'Reasoning',wrong)
        a,b,c,d,e=names[v-1:v+4]
        valid=[p for p in permutations([a,b,c,d,e]) if p.index(c)==p.index(a)+1 and p.index(e)==p.index(c)+1 and p.index(b)==p.index(e)+1 and p.index(d)==p.index(b)+1]
        assert len(valid)==1
        q('Seating arrangements','Five seats',f'{a}, {b}, {c}, {d}, {e} sit left-to-right facing north. {b} is immediately left of {d}; {e} immediately left of {b}; {c} immediately right of {a}; {e} immediately right of {c}. Who sits in the middle?',e,[a,b,d],f'The clues force the order {a}, {c}, {e}, {b}, {d}. The middle (third) seat belongs to {e}.')
        people=5+v; count=factorial(people-2)*2
        n('Seating arrangements','Circular pair',f'{people} distinct people sit at a circular table. Two specified people must be neighbours. Rotations are identical, reflections distinct. Count the seatings.',count,f'Treat the neighbours as one unit: {people-1} units around a circle have {people-2}! arrangements. Multiply by 2 for the pair’s internal order: {count}.')
        floors=4+v; chosen=2+v; correct=floors-chosen+1
        n('Arrangements and puzzles','Floor numbering',f'A building has {floors} occupied floors numbered from 1 at the bottom. A person lives on the {chosen}th floor from the top. What is the floor number from the bottom?',correct,f'Convert the top rank to bottom rank: {floors}−{chosen}+1={correct}.','Easy')
        jobs=list('ABCDE'); survivors=[p for p in permutations(jobs) if p.index('A')<p.index('B') and p.index('C')<p.index('D') and p.index('E')!=v-1]
        n('Arrangements and puzzles','Dependency schedule',f'Five tasks A–E each occupy one of slots 1–5. A must precede B; C must precede D; E cannot occupy slot {v}. How many schedules satisfy all constraints?',len(survivors),f'Fix any allowed slot for E. The other four tasks have 4!/4=6 valid orders, because each precedence constraint halves them. Four allowed E slots give 24 schedules.')
        # A says B is guilty, B says C is guilty, C says B is innocent: exactly one true implies B's statement false.
        q('Statements and conclusions','Exactly one truth',f'In case {v}, exactly one of {a}, {b}, {c} is responsible. {a} says “{b} is responsible”; {b} says “{c} is responsible”; {c} says “{b} is not responsible”. Exactly one statement is true. Who can be ruled out?',c,[a,b,'Nobody'],f'The statements by {a} and {c} are complements, so exactly one is already true. Therefore {b}’s statement is false, ruling out {c}.')
        q('Syllogisms','Sets without assumptions',f'In collection {v}, all amber tokens are round. No round token is heavy. Which conclusion necessarily follows?', 'No amber token is heavy',['All heavy tokens are amber','Some amber tokens are heavy','All round tokens are amber'], 'Amber is a subset of round, and round is disjoint from heavy. Therefore amber and heavy cannot overlap. No existence assumption is needed.','Medium')
        threshold=70+v
        q('Logical connectives','Negating a requirement',f'What is the logical negation of “Every applicant scored at least {threshold} and submitted a portfolio”?',f'At least one applicant scored below {threshold} or did not submit a portfolio',[f'Every applicant scored below {threshold} and submitted no portfolio',f'At least one applicant scored at least {threshold} and submitted a portfolio',f'Every applicant scored below {threshold} or submitted no portfolio'], 'Negating “every” gives “at least one”. By De Morgan, the negation of A AND B is NOT A OR NOT B.')
        q('Logical connectives','Chained conditions',f'For release R{v}: approval implies tests passed, and tests passed implies a build exists. No build exists. What must be true?', 'Approval was not obtained',['Tests definitely passed','Approval was obtained','A build will exist tomorrow'],'From approval → tests → build, take the contrapositive: no build → tests not passed → no approval.','Medium')
        start=3*v; seq=[start+i*i for i in range(5)]; answer=start+25
        n('Number series','Growing differences',f'The rule is a constant plus consecutive squares starting at 0². Complete: {", ".join(map(str,seq))}, __.',answer,f'The constant is {start}. The next square is 5²=25, so the next term is {start}+25={answer}.','Medium')
        start=5+v; seq=[start]
        for i in range(5):seq.append(seq[-1]*(2 if i%2==0 else 1)+(0 if i%2==0 else 3))
        answer=seq[-1]+3
        n('Number series','Alternating operations',f'A sequence alternates “multiply by 2” and “add 3”, beginning with multiplication. Find the next term: {", ".join(map(str,seq))}, __.',answer,f'The fifth operation was multiplication. The next operation is adding 3 to {seq[-1]}, giving {answer}.','Medium')
        word=words[v-1];shift=v+1
        encode=lambda w,k: ''.join(chr((ord(ch)-65+k)%26+65) for ch in w)
        encoded=encode(word,shift)
        q('Coding and decoding','Alphabet shift',f'Each capital letter is shifted forward {shift} positions, wrapping after Z. Encode {word}.',encoded,[encode(word,shift+1),encode(word,shift-1),encode(word,-shift)],f'Apply a +{shift} shift to every letter independently, with modulo-26 wraparound. The code is {encoded}.','Medium')
        encode2=lambda w,k: ''.join(chr((ord(ch)-65+(k if i%2==0 else -k))%26+65) for i,ch in enumerate(w))
        encoded=encode2(word,shift)
        q('Coding and decoding','Alternating shift',f'In {word}, shift letters in odd positions forward by {shift}, and letters in even positions backward by {shift}. Wrap around the alphabet. What is the code?',encoded,[encode2(word,-shift),encode(word,shift),encode(word,-shift)],f'Position counting starts at 1. Apply +{shift}, −{shift}, +{shift}, −{shift}, +{shift}. This yields {encoded}.')
        east=6*v;north=8*v;distance=10*v
        n('Directions','Shortest return',f'A robot travels {east+4} m east, {north+3} m north, 4 m west and 3 m south. Find the shortest distance back to its start.',distance,f'Net displacement is {east} m east and {north} m north. Pythagoras gives sqrt({east}²+{north}²)={distance} m.','Medium')
        dirs=['North','East','South','West'];start=(v-1)%4;right=v+1;left=2
        answer=dirs[(start+right-left)%4]
        q('Directions','Turning robot',f'A robot faces {dirs[start].lower()}. It makes {right} quarter-turns to the right, followed by {left} quarter-turns to the left. Which way does it face?',answer,[d for d in dirs if d!=answer],f'Net clockwise quarter-turns = {right}−{left}={right-left}. Apply that many steps in North → East → South → West. Final direction: {answer}.','Easy')
        families=[
          ('Mira is the daughter of Arun. Bela is Arun’s sister. What is Bela’s relationship to Mira?','Aunt',['Mother','Sister','Grandmother'],'A parent’s sister is an aunt.'),
          ('Neel is the son of Priya. Priya is the daughter of Ravi. What is Ravi’s relationship to Neel?','Grandfather',['Father','Uncle','Brother'],'Ravi is the father of Neel’s mother, so he is Neel’s maternal grandfather.'),
          ('Kiran is male. His only sibling, Ritu, has a daughter named Tara. What is Kiran’s relationship to Tara?','Uncle',['Father','Brother','Grandfather'],'Kiran is the brother of Tara’s mother; this makes him her uncle.'),
          ('Dev and Esha are siblings. Dev’s daughter is Fia; Esha’s son is Gaurav. How are Fia and Gaurav related?','First cousins',['Siblings','Parent and child','Uncle and niece'],'Children of siblings are first cousins.'),
          ('Anaya is married to Bharat. Chitra is Bharat’s mother. How is Chitra related to Anaya?','Mother-in-law',['Aunt','Grandmother','Sister-in-law'],'The mother of a person’s spouse is that person’s mother-in-law.')]
        stem,answer,wrong,why=families[v-1];q('Blood relations','Family tree',stem,answer,wrong,why,'Medium')
        top=8+v;bottom=15+v
        n('Ranking and ordering','Rank from both ends',f'In a queue, Sana is {top}th from the front and {bottom}th from the back. How many people are in the queue?',top+bottom-1,f'Add both ranks and subtract one because Sana is counted twice: {top}+{bottom}−1={top+bottom-1}.','Easy')
        total=100+10*v; aN=55+v;bN=45+2*v;both=20+v;neither=total-aN-bN+both
        n('Sets and Venn diagrams','Neither club',f'Among {total} students, {aN} join Coding, {bN} join Robotics and {both} join both. How many join neither?',neither,f'At least one = {aN}+{bN}−{both}={aN+bN-both}. Subtract from {total} to obtain {neither}.','Medium')
        ab=12+v;bc=15+v;ca=10+v;all3=4+v;exactly=ab+bc+ca-3*all3
        n('Sets and Venn diagrams','Exactly two subjects',f'Counts studying both Math and Physics, Physics and CS, CS and Math are {ab}, {bc}, {ca}, respectively; each includes those taking all three. {all3} students take all three. How many take exactly two?',exactly,f'The sum of pairwise counts counts each all-three student three times. Subtract 3×{all3}: {ab}+{bc}+{ca}−{3*all3}={exactly}.')
        old=120+20*v;new=old+30+10*v;growth=F((new-old)*100,old)
        n('Data interpretation','Comparing releases',f'A product table lists Q1 active users={old}, Q2={new}, Q3={new+25}. What is the exact percentage growth from Q1 to Q2?',growth,f'Growth = (Q2−Q1)/Q1×100 = ({new}−{old})/{old}×100 = {fmt(growth)}%.','Medium')
        ar=20+v;br=30+v; answer=F(ar*80+br*60,ar+br)
        n('Data interpretation','Weighted pass rate',f'Centre A has {ar*5} candidates and an 80% pass rate; centre B has {br*5} candidates and a 60% pass rate. What is the combined pass percentage?',answer,f'Pass count = 0.8×{ar*5}+0.6×{br*5}. Divide by {5*(ar+br)} and multiply by 100: {fmt(answer)}%. Do not average the percentages directly.')
        expense=36000+3600*v;angle=45+9*v;amount=F(expense*angle,360)
        n('Data interpretation','Reading a pie slice',f'A pie chart represents a budget of Rs {expense}. A sector subtends {angle}°. How much spending does it represent?',amount,f'The share is {angle}/360 of the whole: {expense}×{angle}/360 = Rs {fmt(amount)}.','Medium')
        sumv=20+v;diff=4+v
        q('Data sufficiency','Two unknowns',f'What is x? Statement I: x+y={sumv}. Statement II: x−y={diff}. x and y are real numbers. Which statement set is sufficient?','Both together, neither alone',['I alone','II alone','Neither, even together'],f'Each statement alone admits infinitely many x values. Adding both gives 2x={sumv+diff}, fixing x={fmt(F(sumv+diff,2))}.')
        q('Ranking and ordering','Relative heights',f'{a} is taller than {b}. {c} is shorter than {b} but taller than {d}. {e} is taller than {a}. Who is second tallest?',a,[b,c,e],f'The descending order is {e}, {a}, {b}, {c}, {d}. Hence {a} is second tallest.','Medium')
        dt=date(2028,v,10);offset=32+v;after=dt+timedelta(days=offset);answer=after.strftime('%A'); days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        q('Calendars','Day arithmetic',f'{dt.strftime("%d %B %Y")} is a {dt.strftime("%A")}. What day will it be {offset} days later?',answer,[d for d in days if d!=answer][:3],f'Days repeat every 7. The remainder of {offset}/7 is {offset%7}; advance {offset%7} weekdays from {dt.strftime("%A")} to reach {answer}.','Medium')
        hour=2+v;minute=20+5*v;angle=abs(F(hour*30)+F(minute,2)-minute*6);angle=min(angle,360-angle)
        n('Clocks','Angle between hands',f'At {hour}:{minute:02d}, what is the smaller angle, in degrees, between the hands of an ideal clock?',angle,f'Hour angle = 30×{hour}+0.5×{minute}; minute angle = 6×{minute}. Their difference is reduced to the smaller angle: {fmt(angle)}°.')
        side=3+v
        n('Spatial reasoning','Two painted faces',f'A cube is painted on all six outside faces, then cut into {side}×{side}×{side} identical cubes. How many small cubes have exactly two painted faces?',12*(side-2),f'Only edge cubes excluding corners have two painted faces. There are 12 edges and {side-2} such cubes per edge: {12*(side-2)}.')
        n('Spatial reasoning','One painted face',f'A solid cube is painted externally and divided into {side**3} equal cubes in a {side} by {side} by {side} grid. How many have exactly one painted face?',6*(side-2)**2,f'On each of six faces, exclude its border: ({side}−2)² cubes. Total=6×{side-2}²={6*(side-2)**2}.')
        n('Spatial reasoning','Unpainted interior',f'All faces of a cube are painted before it is subdivided {side} times along each axis into {side**3} small cubes. How many have no paint?',(side-2)**3,f'Remove the two outer layers in every dimension. Interior count=({side}−2)³={(side-2)**3}.','Medium')
        width=3+v;height=3;blocked=(2,1);paths=comb(width+height,height)-comb(3,1)*comb(width+height-3,height-1)
        n('Paths and counting','Blocked intersection',f'A grid route goes from (0,0) to ({width},3), moving only one unit right or up. It must avoid (2,1). How many routes are possible?',paths,f'All routes=C({width+3},3). Routes through (2,1)=C(3,1)×C({width},2). Subtract to get {paths}.')
        q('Arrangements and puzzles','Three assignments',f'{a}, {b}, {c} each use a different language: Java, Python, C++. {a} does not use Java; {b} uses neither Java nor C++; {c} does not use C++. Who uses C++?',a,[b,c,'Cannot be determined'],f'{b} must use Python. That leaves Java and C++. Since {a} cannot use Java, {a} uses C++; {c} uses Java.')
        switches=5+v;out=1 if switches%2 else 0
        n('Logical connectives','Parity switch',f'A lamp is initially OFF. Each of {switches} switches flips its state exactly once. Encode ON as 1 and OFF as 0. What is the final state?',out,f'Each pair of flips cancels. {switches} is {"odd" if switches%2 else "even"}, so the final state is {out}.','Easy',[2,3,1-out])
        colours=3+v;guarantee=colours*2+1
        n('Pigeonhole principle','Guaranteed triple',f'A bag contains at least 3 balls in each of {colours} colours. Without looking, how many must be drawn to guarantee 3 balls of one colour?',guarantee,f'In the worst case, draw two of every colour first: {colours*2} balls. The next ball forces a third of one colour, so {guarantee} are sufficient and necessary.')
