
const recommendTagButton = document.getElementById('recommendTagButton');
const recommendTagRandomButton = document.getElementById('recommendTagRandomButton');
const tagAddButton = document.getElementById('tagAddButton');
const inputContainer = document.getElementById('inputContainer');
const maxInputs = 20;
let currentInputCount = 0;

function tagAdd() {
    if (currentInputCount < maxInputs) {
        const wrapper = document.createElement('section');
        wrapper.className = 'tag-row';

        const newInput = document.createElement('input');
        newInput.name = 'tags[]';

        const newButton = document.createElement('button');
        newButton.type = 'button'; // フォーム送信を防ぐ
        newButton.textContent = '削除';
        newButton.addEventListener('click', function () {
            wrapper.remove(); // section全体を削除
            currentInputCount--;
            buttonDisabled(); // ボタン再有効化など
        });
        wrapper.appendChild(newInput);
        wrapper.appendChild(newButton);
        inputContainer.appendChild(wrapper);

        currentInputCount++;
        buttonDisabled();
    }
}


function recommendATagAdd(buttonElement){
    if (currentInputCount < maxInputs) {
        const wrapper = document.createElement('section');
        wrapper.className = 'tag-row';

        const newInput = document.createElement('input');
        newInput.name = 'tags[]';
        newInput.value = document.getElementById("recommended-tags").value;

        const newButton = document.createElement('button');
        newButton.type = 'button'; // フォーム送信を防ぐ
        newButton.textContent = '削除';
        newButton.addEventListener('click', function () {
            wrapper.remove(); // section全体を削除
            currentInputCount--;
            buttonDisabled(); // ボタン再有効化など
        });
        wrapper.appendChild(newInput);
        wrapper.appendChild(newButton);
        inputContainer.appendChild(wrapper);

        currentInputCount++;
        buttonDisabled();
    }
}

function pickRandom(buttonElement){
      if (currentInputCount < maxInputs) {
        const wrapper = document.createElement('section');
        wrapper.className = 'tag-row';

        const newInput = document.createElement('input');
        newInput.name = 'tags';

        const select = document.getElementById('recommended-tags').options;
      const randomIndex = Math.floor(Math.random() * select.length);

        newInput.value =  select[randomIndex].text;

        const newButton = document.createElement('button');
        newButton.type = 'button'; // フォーム送信を防ぐ
        newButton.textContent = '削除';
        newButton.addEventListener('click', function () {
            wrapper.remove(); // section全体を削除
            currentInputCount--;
            buttonDisabled(); // ボタン再有効化など
        });
        wrapper.appendChild(newInput);
        wrapper.appendChild(newButton);
        inputContainer.appendChild(wrapper);

        currentInputCount++;
        buttonDisabled();
    }

}

function buttonDisabled(){
    if (currentInputCount >= maxInputs) {
        recommendTagButton.disabled = true;
    recommendTagRandomButton.disabled = true;
    tagAddButton.disabled = true;
        }else{
            recommendTagButton.disabled = false;
    recommendTagRandomButton.disabled = false;
    tagAddButton.disabled = false;
        }
}